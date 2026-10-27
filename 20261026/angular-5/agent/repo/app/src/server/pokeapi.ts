/**
 * Server-side data layer. Fetches from the PokeAPI at request time, keeps compact
 * summaries of each record in a short-lived in-memory cache, and assembles the view
 * models the pages need.
 */
import type {
  AbilityDetail,
  AbilityRef,
  EvolutionNode,
  MoveDetail,
  MoveRow,
  MoveTable,
  NamedRef,
  PokemonCard,
  PokemonDetail,
  PokemonListPage,
  TypeDetail,
} from '../app/data/models';

const API_BASE_URL = (process.env['API_BASE_URL'] || 'http://localhost:9000').replace(/\/$/, '');
const CACHE_TTL_MS = 60_000;
const PAGE_SIZE = 48;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const LEARN_METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const DAMAGE_RELATIONS: [key: string, label: string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

// ---------------------------------------------------------------------------
// Raw API shapes (only the fields we read)

interface ApiRef {
  name: string;
  url: string;
}
interface ApiName {
  name: string;
  language: ApiRef;
}
interface ApiList {
  results: ApiRef[];
}
interface ApiFlavorText {
  flavor_text: string;
  language: ApiRef;
}
interface ApiEffectEntry {
  short_effect: string;
  language: ApiRef;
}
interface ApiSpecies {
  id: number;
  name: string;
  names: ApiName[];
  genera: { genus: string; language: ApiRef }[];
  flavor_text_entries: ApiFlavorText[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: ApiRef }[];
}
interface ApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: ApiRef }[];
  abilities: { slot: number; is_hidden: boolean; ability: ApiRef }[];
  stats: { base_stat: number; stat: ApiRef }[];
  sprites: { other?: { 'official-artwork'?: { front_default: string | null } } };
  moves: {
    move: ApiRef;
    version_group_details: { level_learned_at: number; version_group: ApiRef; move_learn_method: ApiRef }[];
  }[];
}
interface ApiChainLink {
  species: ApiRef;
  evolves_to: ApiChainLink[];
}
interface ApiMove {
  name: string;
  names: ApiName[];
  type: ApiRef;
  damage_class: ApiRef | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_chance: number | null;
  effect_entries: ApiEffectEntry[];
  flavor_text_entries: ApiFlavorText[];
  learned_by_pokemon: ApiRef[];
}
interface ApiAbility {
  name: string;
  names: ApiName[];
  effect_entries: ApiEffectEntry[];
  flavor_text_entries: ApiFlavorText[];
  pokemon: { is_hidden: boolean; pokemon: ApiRef }[];
}
interface ApiType {
  name: string;
  names: ApiName[];
  damage_relations: Record<string, ApiRef[]>;
  pokemon: { slot: number; pokemon: ApiRef }[];
  moves: ApiRef[];
}
interface ApiGeneration {
  name: string;
  names: ApiName[];
  pokemon_species: ApiRef[];
}
interface ApiVersionGroup {
  name: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Fetching and caching

class NotFoundError extends Error {}

interface CacheEntry {
  expires: number;
  value: Promise<unknown>;
}
const cache = new Map<string, CacheEntry>();

/** Memoizes `load` under `key` for CACHE_TTL_MS. Failed loads are not cached. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v2/${path}`);
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`PokeAPI ${path} responded with ${res.status}`);
  return (await res.json()) as T;
}

/** A resource name taken from a URL segment, normalized for the API. */
function key(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Helpers

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function englishName(names: ApiName[], fallback: string): string {
  return names.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

function latestEnglishFlavorText(entries: ApiFlavorText[]): string | null {
  const english = entries.filter((e) => e.language.name === 'en');
  const last = english[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

/** Alternate forms (Mega Evolutions etc.) have Pokémon IDs above 10000. */
function isDefaultForm(id: number): boolean {
  return Number.isFinite(id) && id < 10000;
}

function spriteUrl(id: number): string {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

// ---------------------------------------------------------------------------
// Compact, cached summaries of API records

interface TypeSummary {
  name: string;
  label: string;
  relations: Record<string, string[]>;
  pokemon: { id: number; slot: number }[];
  moves: string[];
}

function typeSummary(name: string): Promise<TypeSummary> {
  return cached(`type/${name}`, async () => {
    const t = await fetchJson<ApiType>(`type/${key(name)}/`);
    return {
      name: t.name,
      label: englishName(t.names, t.name),
      relations: Object.fromEntries(
        Object.entries(t.damage_relations).map(([k, refs]) => [k, refs.map((r) => r.name)]),
      ),
      pokemon: t.pokemon.map((p) => ({ id: idFromUrl(p.pokemon.url), slot: p.slot })),
      moves: t.moves.map((m) => m.name),
    };
  });
}

/** All types the API lists, in API order, with their summaries. */
function allTypes(): Promise<TypeSummary[]> {
  return cached('types', async () => {
    const list = await fetchJson<ApiList>('type/?limit=1000');
    return Promise.all(list.results.map((r) => typeSummary(r.name)));
  });
}

async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, t.label]));
}

function typeRef(name: string, labels: Map<string, string>): NamedRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/** Species ID -> species name, for every species the API lists. */
function speciesNames(): Promise<Map<number, string>> {
  return cached('species-index', async () => {
    const list = await fetchJson<ApiList>('pokemon-species/?limit=100000');
    return new Map(list.results.map((r) => [idFromUrl(r.url), r.name]));
  });
}

interface GenerationSummary {
  name: string;
  label: string;
  species: number[];
}

function generations(): Promise<GenerationSummary[]> {
  return cached('generations', async () => {
    const list = await fetchJson<ApiList>('generation/?limit=1000');
    return Promise.all(
      list.results.map(async (r) => {
        const g = await fetchJson<ApiGeneration>(`generation/${key(r.name)}/`);
        return {
          name: g.name,
          label: englishName(g.names, g.name),
          species: g.pokemon_species.map((s) => idFromUrl(s.url)),
        };
      }),
    );
  });
}

interface MoveSummary {
  name: string;
  label: string;
  type: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: number[];
}

function moveSummary(name: string): Promise<MoveSummary> {
  return cached(`move/${name}`, async () => {
    const m = await fetchJson<ApiMove>(`move/${key(name)}/`);
    const shortEffect = m.effect_entries.find((e) => e.language.name === 'en')?.short_effect;
    const effect = shortEffect
      ? shortEffect.replaceAll('$effect_chance', String(m.effect_chance ?? '')).replace(/\s+/g, ' ').trim()
      : latestEnglishFlavorText(m.flavor_text_entries);
    return {
      name: m.name,
      label: englishName(m.names, m.name),
      type: m.type.name,
      category: m.damage_class ? humanize(m.damage_class.name) : null,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      effect,
      learnedBy: m.learned_by_pokemon.map((p) => idFromUrl(p.url)),
    };
  });
}

function versionGroupOrder(name: string): Promise<number> {
  return cached(`version-group/${name}`, async () => {
    const vg = await fetchJson<ApiVersionGroup>(`version-group/${key(name)}/`);
    return vg.order;
  });
}

// ---------------------------------------------------------------------------
// Cards

async function cardsFor(
  entries: { id: number; hiddenAbility?: boolean }[],
): Promise<PokemonCard[]> {
  const names = await speciesNames();
  const seen = new Set<number>();
  return entries
    .filter((e) => isDefaultForm(e.id) && names.has(e.id))
    .sort((a, b) => a.id - b.id)
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .map((e) => {
      const name = names.get(e.id)!;
      const card: PokemonCard = { id: e.id, name, label: humanize(name), sprite: spriteUrl(e.id) };
      if (e.hiddenAbility !== undefined) card.hiddenAbility = e.hiddenAbility;
      return card;
    });
}

// ---------------------------------------------------------------------------
// Pages

export async function pokemonList(params: URLSearchParams): Promise<PokemonListPage> {
  const [names, types, gens] = await Promise.all([speciesNames(), allTypes(), generations()]);
  const shownTypes = types.filter((t) => !EXCLUDED_TYPES.has(t.name));

  const typesById = new Map<number, { slot: number; ref: NamedRef }[]>();
  for (const t of shownTypes) {
    for (const p of t.pokemon) {
      if (!typesById.has(p.id)) typesById.set(p.id, []);
      typesById.get(p.id)!.push({ slot: p.slot, ref: { name: t.name, label: t.label } });
    }
  }

  const q = (params.get('q') ?? '').trim().toLowerCase();
  const type = params.get('type') ?? '';
  const generation = params.get('generation') ?? '';
  const genSpecies = generation ? new Set(gens.find((g) => g.name === generation)?.species ?? []) : null;

  const matches: PokemonCard[] = [];
  for (const [id, name] of [...names].sort((a, b) => a[0] - b[0])) {
    if (!isDefaultForm(id)) continue;
    const label = humanize(name);
    if (q && !label.toLowerCase().includes(q)) continue;
    const cardTypes = (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.ref);
    if (type && !cardTypes.some((t) => t.name === type)) continue;
    if (genSpecies && !genSpecies.has(id)) continue;
    matches.push({ id, name, label, sprite: spriteUrl(id), types: cardTypes });
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(params.get('page') ?? '1', 10);
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(requested) ? requested : 1));
  return {
    count: matches.length,
    page,
    totalPages,
    cards: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    types: shownTypes.map((t) => ({ name: t.name, label: t.label })),
    generations: gens.map((g) => ({ name: g.name, label: g.label })),
  };
}

function evolutionTree(link: ApiChainLink): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: link.evolves_to.map(evolutionTree),
  };
}

function compareLearnMethods(a: MoveTable, b: MoveTable): number {
  const rank = (m: string) => {
    const i = LEARN_METHOD_ORDER.indexOf(m);
    return i === -1 ? LEARN_METHOD_ORDER.length : i;
  };
  return rank(a.method) - rank(b.method) || a.label.localeCompare(b.label);
}

export async function pokemonDetail(name: string, params: URLSearchParams): Promise<PokemonDetail> {
  const species = await cached(`species/${key(name)}`, async () => {
    const s = await fetchJson<ApiSpecies>(`pokemon-species/${key(name)}/`);
    const defaultVariety = s.varieties.find((v) => v.is_default)?.pokemon;
    return {
      id: s.id,
      name: s.name,
      label: englishName(s.names, s.name),
      genus: s.genera.find((g) => g.language.name === 'en')?.genus ?? null,
      flavorText: latestEnglishFlavorText(s.flavor_text_entries),
      evolutionChain: s.evolution_chain?.url ?? null,
      pokemonId: defaultVariety ? idFromUrl(defaultVariety.url) : s.id,
    };
  });

  const [pokemon, evolution, labels] = await Promise.all([
    cached(`pokemon/${species.pokemonId}`, async () => {
      const p = await fetchJson<ApiPokemon>(`pokemon/${species.pokemonId}/`);
      // Keep only what the page uses: the full record is mostly per-game move data.
      return {
        height: p.height,
        weight: p.weight,
        types: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        abilities: [...p.abilities]
          .sort((a, b) => a.slot - b.slot)
          .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
        stats: p.stats.map((s) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat })),
        artwork: p.sprites.other?.['official-artwork']?.front_default ?? null,
        moves: p.moves.flatMap((m) =>
          m.version_group_details.map((d) => ({
            move: m.move.name,
            game: d.version_group.name,
            method: d.move_learn_method.name,
            level: d.level_learned_at,
          })),
        ),
      };
    }),
    species.evolutionChain
      ? cached(`evolution-chain/${idFromUrl(species.evolutionChain)}`, async () => {
          const chain = await fetchJson<{ chain: ApiChainLink }>(
            `evolution-chain/${idFromUrl(species.evolutionChain!)}/`,
          );
          return evolutionTree(chain.chain);
        })
      : Promise.resolve(null),
    typeLabels(),
  ]);

  const gameNames = [...new Set(pokemon.moves.map((m) => m.game))];
  const orders = await Promise.all(gameNames.map(versionGroupOrder));
  const games = gameNames
    .map((g, i) => ({ name: g, label: humanize(g), order: orders[i] }))
    .sort((a, b) => a.order - b.order);
  const requestedGame = params.get('game');
  const game = games.find((g) => g.name === requestedGame) ?? games[games.length - 1] ?? null;

  const learned = game ? pokemon.moves.filter((m) => m.game === game.name) : [];
  const summaries = new Map(
    await Promise.all(
      [...new Set(learned.map((m) => m.move))].map(async (m) => [m, await moveSummary(m)] as const),
    ),
  );
  const tables = new Map<string, MoveRow[]>();
  for (const m of learned) {
    const move = summaries.get(m.move)!;
    if (!tables.has(m.method)) tables.set(m.method, []);
    tables.get(m.method)!.push({
      level: m.method === 'level-up' ? m.level : null,
      name: move.name,
      label: move.label,
      type: typeRef(move.type, labels),
      category: move.category,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    });
  }
  const moveTables = [...tables]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))
    .sort(compareLearnMethods);

  return {
    id: species.id,
    name: species.name,
    label: species.label,
    genus: species.genus,
    types: pokemon.types.map((t) => typeRef(t, labels)),
    artwork: pokemon.artwork,
    height: pokemon.height,
    weight: pokemon.weight,
    flavorText: species.flavorText,
    stats: pokemon.stats,
    abilities: pokemon.abilities.map((a): AbilityRef => ({ ...a, label: humanize(a.name) })),
    evolution,
    games: games.map(({ name, label }) => ({ name, label })),
    game: game?.name ?? null,
    moveTables,
  };
}

export async function moveDetail(name: string): Promise<MoveDetail> {
  const [move, labels] = await Promise.all([moveSummary(name), typeLabels()]);
  return {
    name: move.name,
    label: move.label,
    type: typeRef(move.type, labels),
    category: move.category,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: move.effect,
    learnedBy: await cardsFor(move.learnedBy.map((id) => ({ id }))),
  };
}

export async function abilityDetail(name: string): Promise<AbilityDetail> {
  const ability = await cached(`ability/${key(name)}`, async () => {
    const a = await fetchJson<ApiAbility>(`ability/${key(name)}/`);
    return {
      name: a.name,
      label: englishName(a.names, a.name),
      effect:
        a.effect_entries.find((e) => e.language.name === 'en')?.short_effect.replace(/\s+/g, ' ').trim() ??
        latestEnglishFlavorText(a.flavor_text_entries),
      pokemon: a.pokemon.map((p) => ({ id: idFromUrl(p.pokemon.url), hiddenAbility: p.is_hidden })),
    };
  });
  return { ...ability, pokemon: await cardsFor(ability.pokemon) };
}

export async function typeList(): Promise<NamedRef[]> {
  return (await allTypes())
    .filter((t) => !EXCLUDED_TYPES.has(t.name))
    .map((t) => ({ name: t.name, label: t.label }));
}

export async function typeDetail(name: string): Promise<TypeDetail> {
  const [type, labels] = await Promise.all([typeSummary(name.trim().toLowerCase()), typeLabels()]);
  return {
    name: type.name,
    label: type.label,
    relations: DAMAGE_RELATIONS.map(([k, label]) => ({
      label,
      types: (type.relations[k] ?? []).map((t) => typeRef(t, labels)),
    })),
    pokemon: await cardsFor(type.pokemon),
    moves: type.moves
      .map((m) => ({ name: m, label: humanize(m) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

// ---------------------------------------------------------------------------
// Routing

/**
 * Resolves a data path such as `pokemon/pikachu` to its view model, or `null` if the
 * page or the resource it names doesn't exist.
 */
export async function loadData(path: string, params: URLSearchParams): Promise<unknown> {
  let segments: string[];
  try {
    segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  const [resource, name, ...rest] = segments;
  if (rest.length) return null;
  try {
    switch (resource) {
      case 'pokemon-list':
        return name ? null : await pokemonList(params);
      case 'types':
        return name ? await typeDetail(name) : await typeList();
      case 'pokemon':
        return name ? await pokemonDetail(name, params) : null;
      case 'moves':
        return name ? await moveDetail(name) : null;
      case 'abilities':
        return name ? await abilityDetail(name) : null;
      default:
        return null;
    }
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}
