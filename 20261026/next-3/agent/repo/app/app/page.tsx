import Link from "next/link";
import { Filters } from "@/components/Filters";
import { PokemonCards } from "@/components/PokemonCards";
import { getGenerations, getSpeciesIndex, getTypes, spriteUrl, type CardData } from "@/lib/data";

const PAGE_SIZE = 48;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const [index, types, generations] = await Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]);

  const type = types.some((t) => t.name === first(params.type)) ? first(params.type) : "";
  const generation = generations.some((g) => g.name === first(params.generation)) ? first(params.generation) : "";
  const typeLabels = new Map(types.map((t) => [t.name, t.label]));

  const needle = q.toLowerCase();
  const matches = index.filter(
    (entry) =>
      (!needle || entry.label.toLowerCase().includes(needle)) &&
      (!type || entry.types.includes(type)) &&
      (!generation || entry.generation === generation),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(first(params.page), 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;

  const cards: CardData[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({
    id: entry.id,
    name: entry.name,
    label: entry.label,
    sprite: spriteUrl(entry.id),
    types: entry.types.map((name) => ({ name, label: typeLabels.get(name) ?? name })),
  }));

  const pageHref = (n: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (type) query.set("type", type);
    if (generation) query.set("generation", generation);
    if (n > 1) query.set("page", String(n));
    const s = query.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <h1 className="page-title">Pokémon</h1>
      <Filters
        q={q}
        type={type}
        generation={generation}
        types={types.map(({ name, label }) => ({ name, label }))}
        generations={generations.map(({ name, label }) => ({ name, label }))}
      />
      {matches.length === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{matches.length} Pokémon</p>
          <PokemonCards cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <Link href={pageHref(page - 1)} prefetch={false}>
                Previous page
              </Link>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageHref(page + 1)} prefetch={false}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
