import { api, apiBaseUrl, apiList, getTypeRecords } from '@/lib/api';
import { englishName, humanize, idFromUrl, MAX_SPECIES_ID } from '@/lib/format';
import { HomeView, type IndexEntry } from './HomeView';

async function getGenerations() {
  const list = await apiList('generation');
  return Promise.all(
    list.map(async (g) => {
      const data = await api(g.url);
      return { name: g.name, label: englishName(data.names) ?? humanize(g.name), data };
    }),
  );
}

export default async function Home() {
  const [species, types, generations] = await Promise.all([
    apiList('pokemon-species'),
    getTypeRecords(),
    getGenerations(),
  ]);

  // Types of each default Pokémon (same ID as its species), in slot order.
  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.data.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(pokemon.url);
      if (!id || id > MAX_SPECIES_ID) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, name: type.name });
      typesById.set(id, list);
    }
  }

  const generationById = new Map<number, string>();
  for (const gen of generations) {
    for (const s of gen.data.pokemon_species as { url: string }[]) {
      const id = idFromUrl(s.url);
      if (id) generationById.set(id, gen.name);
    }
  }

  const entries: IndexEntry[] = [];
  for (const s of species) {
    const id = idFromUrl(s.url);
    if (!id || id > MAX_SPECIES_ID) continue;
    const t = (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((x) => x.name);
    entries.push([id, s.name, t, generationById.get(id) ?? '']);
  }
  entries.sort((a, b) => a[0] - b[0]);

  return (
    <HomeView
      entries={entries}
      types={types.map(({ name, label }) => ({ name, label }))}
      generations={generations.map(({ name, label }) => ({ name, label }))}
      apiBase={apiBaseUrl()}
    />
  );
}
