const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')!;
  const type = await pokeapiOr404(`type/${encodeURIComponent(name.toLowerCase())}`);
  if (['stellar', 'unknown', 'shadow'].includes(type.name)) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsFor(type.pokemon.map((p: any) => p.pokemon))]);
  const typeRef = (t: { name: string }) => ({ name: t.name, label: labels[t.name] ?? humanize(t.name) });
  return {
    name: type.name,
    label: englishName(type),
    relations: RELATIONS.map(([label, key]) => ({ label, types: (type.damage_relations?.[key] ?? []).map(typeRef) })),
    pokemon,
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label)),
  };
});
