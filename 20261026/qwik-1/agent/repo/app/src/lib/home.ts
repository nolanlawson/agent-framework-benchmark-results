import { api, allTypes, english, idFromUrl, spriteUrl, speciesIndex } from "./api";
import { humanize, padDex, type CardData, type TypeRef } from "./format";

export const PAGE_SIZE = 48;

type IndexEntry = CardData & { generation?: string; typeNames: string[] };

async function generations() {
  const list = await api(`generation/?limit=1000`);
  return Promise.all(
    (list.results as { name: string; url: string }[]).map(async (g) => {
      const data = await api(g.url);
      return {
        name: g.name,
        label: english(data.names) ?? humanize(g.name),
        species: (data.pokemon_species as { url: string }[]).map((s) => idFromUrl(s.url)),
      };
    }),
  );
}

/** Every species with its default Pokémon's types and its generation. */
async function buildIndex() {
  const [species, types, gens] = await Promise.all([speciesIndex(), allTypes(), generations()]);

  const slots = new Map<number, { slot: number; type: TypeRef }[]>();
  for (const t of types) {
    for (const p of t.data.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!species.has(id)) continue;
      const list = slots.get(id) ?? [];
      list.push({ slot: p.slot, type: { name: t.name, label: t.label } });
      slots.set(id, list);
    }
  }
  const genOf = new Map<number, string>();
  for (const g of gens) for (const id of g.species) genOf.set(id, g.name);

  const entries: IndexEntry[] = [...species.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => {
      const t = (slots.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((s) => s.type);
      return {
        id,
        name,
        label: humanize(name),
        dex: padDex(id),
        sprite: spriteUrl(id),
        types: t,
        typeNames: t.map((x) => x.name),
        generation: genOf.get(id),
      };
    });

  return {
    entries,
    typeOptions: types.map((t) => ({ name: t.name, label: t.label })),
    genOptions: gens.map((g) => ({ name: g.name, label: g.label })),
  };
}

export type HomeFilters = { q: string; type: string; generation: string; page: number };

export function parseFilters(params: URLSearchParams): HomeFilters {
  const page = parseInt(params.get("page") ?? "1", 10);
  return {
    q: params.get("q") ?? "",
    type: params.get("type") ?? "",
    generation: params.get("generation") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export async function homeData(filters: HomeFilters) {
  const { entries, typeOptions, genOptions } = await buildIndex();
  const q = filters.q.trim().toLowerCase();
  const matches = entries.filter(
    (e) =>
      (!q || e.label.toLowerCase().includes(q)) &&
      (!filters.type || e.typeNames.includes(filters.type)) &&
      (!filters.generation || e.generation === filters.generation),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const cards: CardData[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ typeNames: _t, generation: _g, ...card }) => card);
  return { filters: { ...filters, page }, count: matches.length, totalPages, cards, typeOptions, genOptions };
}
