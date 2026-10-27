export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')!;
  const move = await pokeapiOr404(`move/${encodeURIComponent(name.toLowerCase())}`);
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsFor(move.learned_by_pokemon ?? [])]);
  return {
    name: move.name,
    label: englishName(move),
    type: move.type ? { name: move.type.name, label: labels[move.type.name] ?? humanize(move.type.name) } : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: englishShortEffect(move.effect_entries) ?? latestFlavorText(move.flavor_text_entries),
    pokemon,
  };
});
