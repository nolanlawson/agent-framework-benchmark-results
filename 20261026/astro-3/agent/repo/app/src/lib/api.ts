// Data access for the PokeAPI server. Everything is fetched over HTTP at request time and
// kept in a small in-memory cache (stale-while-revalidate) so pages stay fast while still
// picking up changes to the live data.

export const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');

const FRESH_MS = 60_000;
const MAX_ENTRIES = 5_000;

type Entry<T> = { value?: T; promise?: Promise<T>; fetchedAt: number };
const cache = new Map<string, Entry<unknown>>();

/** Memoize an async computation under `key`, serving stale values while refreshing. */
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (entry) {
    // Keep recently used keys at the end of the Map for LRU eviction.
    cache.delete(key);
    cache.set(key, entry);
    if (entry.promise) return entry.promise;
    if (now - entry.fetchedAt < FRESH_MS) return Promise.resolve(entry.value as T);
    // Stale: refresh in the background, answer with what we have.
    refresh(key, entry, load).catch(() => {});
    return Promise.resolve(entry.value as T);
  }
  const fresh: Entry<T> = { fetchedAt: 0 };
  cache.set(key, fresh);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return refresh(key, fresh, load);
}

function refresh<T>(key: string, entry: Entry<T>, load: () => Promise<T>): Promise<T> {
  const promise = load().then(
    (value) => {
      entry.value = value;
      entry.fetchedAt = Date.now();
      entry.promise = undefined;
      return value;
    },
    (err) => {
      entry.promise = undefined;
      if (entry.fetchedAt === 0) cache.delete(key);
      throw err;
    },
  );
  entry.promise = promise;
  return promise;
}

export class NotFoundError extends Error {}

/** GET an API path (e.g. `pokemon/25`) or absolute API URL. Resolves to null on 404. */
export function get<T = any>(pathOrUrl: string): Promise<T | null> {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
  return memo(`get:${url}`, async () => {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    return (await res.json()) as T;
  });
}

async function must<T = any>(pathOrUrl: string): Promise<T> {
  const data = await get<T>(pathOrUrl);
  if (data == null) throw new Error(`Missing API resource ${pathOrUrl}`);
  return data;
}

// ---------------------------------------------------------------------------------------
// Helpers

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string) =>
  name
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

type Named = { name: string; language: { name: string } };
export const englishName = (r: { name: string; names?: Named[] }) =>
  r.names?.find((n) => n.language.name === 'en')?.name ?? humanize(r.name);

export function latestEnglishFlavor(entries: any[] | undefined, field = 'flavor_text'): string | null {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = en[en.length - 1];
  return last ? String(last[field]).replace(/\s+/g, ' ').trim() : null;
}

export const englishShortEffect = (entries: any[] | undefined): string | null =>
  (entries ?? []).find((e) => e.language?.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() || null;

/** Run `fn` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const isAlternateForm = (pokemonId: number) => !(pokemonId > 0 && pokemonId < 10000);

// ---------------------------------------------------------------------------------------
// Shared indexes

export type TypeInfo = {
  name: string;
  label: string;
  /** Default-Pokémon (= species) IDs of this type, with their slot. */
  pokemon: { id: number; slot: number }[];
};

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, with English names. */
export function getTypes(): Promise<TypeInfo[]> {
  return memo('types', async () => {
    const list = await must('type/?limit=1000');
    const names: string[] = list.results.map((r: any) => r.name).filter((n: string) => !EXCLUDED_TYPES.has(n));
    return Promise.all(
      names.map(async (name) => {
        const t = await must(`type/${name}`);
        return {
          name,
          label: englishName(t),
          pokemon: t.pokemon
            .map((p: any) => ({ id: idFromUrl(p.pokemon.url), slot: p.slot }))
            .filter((p: any) => !isAlternateForm(p.id)),
        };
      }),
    );
  });
}

export async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export type GenerationInfo = { name: string; label: string; species: number[] };

export function getGenerations(): Promise<GenerationInfo[]> {
  return memo('generations', async () => {
    const list = await must('generation/?limit=1000');
    const gens = await Promise.all(
      list.results.map(async (r: any) => {
        const g = await must(r.url);
        return {
          id: g.id as number,
          name: g.name as string,
          label: englishName(g),
          species: g.pokemon_species.map((s: any) => idFromUrl(s.url)),
        };
      }),
    );
    return gens.sort((a, b) => a.id - b.id).map(({ id, ...g }) => g);
  });
}

export type SpeciesSummary = {
  id: number;
  name: string;
  label: string;
  types: string[];
  generation: string | null;
};

/** Every species with its default Pokémon's types and its generation, ordered by dex number. */
export function getSpeciesIndex(): Promise<{ list: SpeciesSummary[]; byId: Map<number, SpeciesSummary> }> {
  return memo('species-index', async () => {
    const [list, types, generations] = await Promise.all([
      must('pokemon-species/?limit=100000'),
      getTypes(),
      getGenerations(),
    ]);
    const typesById = new Map<number, { slot: number; name: string }[]>();
    for (const t of types) {
      for (const p of t.pokemon) {
        if (!typesById.has(p.id)) typesById.set(p.id, []);
        typesById.get(p.id)!.push({ slot: p.slot, name: t.name });
      }
    }
    const genById = new Map<number, string>();
    for (const g of generations) for (const id of g.species) genById.set(id, g.name);

    const species: SpeciesSummary[] = list.results
      .map((r: any) => {
        const id = idFromUrl(r.url);
        return {
          id,
          name: r.name,
          label: humanize(r.name),
          types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
          generation: genById.get(id) ?? null,
        };
      })
      .sort((a: SpeciesSummary, b: SpeciesSummary) => a.id - b.id);
    return { list: species, byId: new Map(species.map((s) => [s.id, s])) };
  });
}

export type CardData = { id: number; name: string; label: string; types?: string[]; hidden?: boolean };

/** Turn Pokémon references into species cards: alternate forms dropped, deduped, by dex number. */
export async function cardsForPokemon(refs: { url: string; hidden?: boolean }[]): Promise<CardData[]> {
  const { byId } = await getSpeciesIndex();
  const seen = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (isAlternateForm(id) || seen.has(id)) continue;
    const s = byId.get(id);
    if (s) {
      seen.set(id, { id, name: s.name, label: s.label, hidden: ref.hidden });
    } else {
      // Species list is cached; fall back to the Pokémon record for very fresh entries.
      const p = await get(`pokemon/${id}`);
      if (!p) continue;
      const species = p.species?.name ?? p.name;
      seen.set(id, { id, name: species, label: humanize(species), hidden: ref.hidden });
    }
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------
// Pages

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] };

function toEvolutionNode(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(toEvolutionNode),
  };
}

export type MoveRow = {
  name: string;
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  level: number;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export function getMoveSummary(nameOrUrl: string) {
  return memo(`move-summary:${nameOrUrl}`, async () => {
    const m = await must(nameOrUrl.startsWith('http') ? nameOrUrl : `move/${nameOrUrl}`);
    return {
      name: m.name as string,
      label: englishName(m),
      type: m.type?.name as string,
      category: m.damage_class ? humanize(m.damage_class.name) : null,
      power: m.power as number | null,
      accuracy: m.accuracy as number | null,
      pp: m.pp as number | null,
    };
  });
}

export async function getPokemonPage(speciesName: string, game: string | null) {
  const species = await get(`pokemon-species/${encodeURIComponent(speciesName.toLowerCase())}`);
  if (!species) return null;
  const variety = species.varieties?.find((v: any) => v.is_default)?.pokemon;
  const [pokemon, chain, labels] = await Promise.all([
    get(variety?.url ?? `pokemon/${species.id}`),
    species.evolution_chain?.url ? get(species.evolution_chain.url) : Promise.resolve(null),
    typeLabels(),
  ]);
  if (!pokemon) return null;

  // Version groups in which this Pokémon learns moves, by their `order`.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  const groups = (
    await mapLimit([...groupNames], 8, async (name) => {
      const vg = await get(`version-group/${name}`);
      return { name, label: humanize(name), order: (vg?.order as number) ?? 0 };
    })
  ).sort((a, b) => a.order - b.order);
  const selected = groups.find((g) => g.name === game) ?? groups[groups.length - 1] ?? null;

  const learned: { move: any; method: string; level: number }[] = [];
  if (selected) {
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== selected.name) continue;
        learned.push({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at });
      }
    }
  }
  const summaries = new Map(
    await mapLimit([...new Set(learned.map((l) => l.move.url as string))], 16, async (url) => [
      url,
      await getMoveSummary(url),
    ] as const),
  );

  const byMethod = new Map<string, MoveRow[]>();
  for (const l of learned) {
    const s = summaries.get(l.move.url)!;
    const row: MoveRow = { ...s, typeLabel: labels.get(s.type) ?? humanize(s.type), level: l.level };
    if (!byMethod.has(l.method)) byMethod.set(l.method, []);
    byMethod.get(l.method)!.push(row);
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  const tables: MoveTable[] = [...byMethod.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([method, rows]) => {
      const dedup = new Map(rows.map((r) => [`${r.name}:${method === 'level-up' ? r.level : ''}`, r]));
      const sorted = [...dedup.values()].sort(
        (a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.label.localeCompare(b.label),
      );
      return { method, label: humanize(method), rows: sorted };
    });

  const stats = pokemon.stats.map((s: any) => ({
    name: s.stat.name as string,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    id: species.id as number,
    name: species.name as string,
    label: englishName(species),
    genus: species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height as number,
    weight: pokemon.weight as number,
    types: [...pokemon.types]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name as string, label: labels.get(t.type.name) ?? humanize(t.type.name) })),
    stats,
    total: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, label: humanize(a.ability.name), hidden: !!a.is_hidden })),
    evolution: chain?.chain ? toEvolutionNode(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    groups,
    selected: selected?.name ?? null,
    tables,
  };
}

export async function getMovePage(name: string) {
  const move = await get(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    cardsForPokemon(move.learned_by_pokemon ?? []),
  ]);
  return {
    name: move.name as string,
    label: englishName(move),
    type: move.type ? { name: move.type.name as string, label: labels.get(move.type.name) ?? humanize(move.type.name) } : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect: englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries),
    learnedBy,
  };
}

export async function getAbilityPage(name: string) {
  const ability = await get(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  const pokemon = await cardsForPokemon(
    (ability.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: !!p.is_hidden })),
  );
  return {
    name: ability.name as string,
    label: englishName(ability),
    effect: englishShortEffect(ability.effect_entries) ?? latestEnglishFlavor(ability.flavor_text_entries),
    pokemon,
  };
}

export const DAMAGE_RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const;

export async function getTypePage(name: string) {
  const key = name.toLowerCase();
  if (EXCLUDED_TYPES.has(key)) return null;
  const type = await get(`type/${encodeURIComponent(key)}`);
  if (!type) return null;
  const labels = await typeLabels();
  const ref = (t: any) => ({ name: t.name as string, label: labels.get(t.name) ?? humanize(t.name) });
  return {
    name: type.name as string,
    label: englishName(type),
    relations: DAMAGE_RELATIONS.map(([key, label]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).filter((t: any) => !EXCLUDED_TYPES.has(t.name)).map(ref),
    })),
    pokemon: await cardsForPokemon((type.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url }))),
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label) || a.name.localeCompare(b.name)),
  };
}

// ---------------------------------------------------------------------------------------
// Home page list

export const PAGE_SIZE = 48;

export type ListQuery = { q: string; type: string; generation: string; page: number };

export function parseListQuery(params: URLSearchParams): ListQuery {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    q: (params.get('q') ?? '').trim(),
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function listQueryString(query: ListQuery, page = query.page) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  if (query.generation) params.set('generation', query.generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function getPokemonList(query: ListQuery) {
  const { list } = await getSpeciesIndex();
  const needle = query.q.toLowerCase();
  const matches = list.filter(
    (s) =>
      (!needle || s.label.toLowerCase().includes(needle)) &&
      (!query.type || s.types.includes(query.type)) &&
      (!query.generation || s.generation === query.generation),
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    count: matches.length,
    page,
    pages,
    items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}
