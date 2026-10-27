const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')!;
  const species = await pokeapiOr404(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const pokemonPath = variety ? `pokemon/${idFromUrl(variety.pokemon.url)}` : `pokemon/${species.id}`;

  const [pokemon, chain, labels] = await Promise.all([
    pokeapiOr404(pokemonPath),
    species.evolution_chain ? pokeapi(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    typeLabels(),
  ]);

  // Moves: details for every move this Pokémon learns, plus every version group it learns them in.
  const gameNames = new Set<string>();
  for (const m of pokemon.moves ?? []) for (const d of m.version_group_details) gameNames.add(d.version_group.name);

  const [moveRecords, gameRecords] = await Promise.all([
    Promise.all((pokemon.moves ?? []).map((m: any) => pokeapi(`move/${m.move.name}`))),
    Promise.all([...gameNames].map((g) => pokeapi(`version-group/${g}`))),
  ]);

  const games = gameRecords
    .map((g: any, i) => ({ name: [...gameNames][i], label: humanize([...gameNames][i]), order: g?.order ?? Infinity }))
    .sort((a, b) => a.order - b.order)
    .map(({ name, label }) => ({ name, label }));

  const moves = (pokemon.moves ?? []).map((m: any, i: number) => {
    const move = moveRecords[i];
    const seen = new Set<string>();
    const learn: [string, string, number][] = [];
    for (const d of m.version_group_details) {
      const key = `${d.version_group.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learn.push([d.version_group.name, d.move_learn_method.name, d.level_learned_at]);
    }
    const typeName = move?.type?.name;
    return {
      name: m.move.name,
      label: move ? englishName(move) : humanize(m.move.name),
      type: typeName ? { name: typeName, label: labels[typeName] ?? humanize(typeName) } : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
      learn,
    };
  });

  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null;

  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus,
    flavorText: latestFlavorText(species.flavor_text_entries),
    types: [...(pokemon.types ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, label: labels[t.type.name] ?? humanize(t.type.name) })),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    stats: (pokemon.stats ?? []).map((s: any) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games,
    moves,
  };
});
