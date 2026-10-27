export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')!;
  const ability = await pokeapiOr404(`ability/${encodeURIComponent(name.toLowerCase())}`);
  return {
    name: ability.name,
    label: englishName(ability),
    effect: englishShortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon: await cardsFor(ability.pokemon.map((p: any) => ({ ...p.pokemon, hidden: p.is_hidden })), (p: any) => ({
      hidden: p.hidden,
    })),
  };
});
