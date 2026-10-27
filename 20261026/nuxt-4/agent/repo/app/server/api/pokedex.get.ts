// Everything the Pokémon list needs to filter and render every species client-side.
export default defineEventHandler(async () => {
  const [species, types, generationList] = await Promise.all([
    listAll('pokemon-species'),
    allTypes(),
    listAll('generation'),
  ]);

  const [typeRecords, generations] = await Promise.all([
    Promise.all(types.map((t) => pokeapi(`type/${t.name}`))),
    Promise.all(generationList.map((g) => pokeapi(`generation/${g.name}`))),
  ]);

  // Default Pokémon ID (= species ID) -> types in slot order.
  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const t of typeRecords) {
    if (!t) continue;
    for (const p of t.pokemon ?? []) {
      const id = idFromUrl(p.pokemon.url);
      if (id > 10000) continue;
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot: p.slot, name: t.name });
    }
  }

  const generationById = new Map<number, string>();
  for (const g of generations) {
    if (!g) continue;
    for (const s of g.pokemon_species ?? []) generationById.set(idFromUrl(s.url), g.name);
  }

  const pokemon = species
    .map((s) => {
      const id = idFromUrl(s.url);
      return {
        id,
        name: s.name,
        sprite: spriteUrl(id),
        generation: generationById.get(id) ?? null,
        types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
      };
    })
    .sort((a, b) => a.id - b.id);

  return {
    pokemon,
    types,
    generations: generations
      .filter(Boolean)
      .sort((a: any, b: any) => a.id - b.id)
      .map((g: any) => ({ name: g.name, label: englishName(g) })),
  };
});
