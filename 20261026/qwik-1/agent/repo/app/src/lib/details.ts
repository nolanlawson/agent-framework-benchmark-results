import { apiOrNull, allTypes, english, latestEnglishFlavor, pokemonCards, typeLabels, typeRef } from "./api";
import { DASH, humanize, type TypeRef } from "./format";

export async function moveData(name: string) {
  const move = await apiOrNull(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [labels, cards] = await Promise.all([typeLabels(), pokemonCards(move.learned_by_pokemon ?? [])]);
  const short = english(move.effect_entries, "short_effect")?.replace(
    /\$effect_chance/g,
    String(move.effect_chance ?? ""),
  );
  return {
    name: move.name as string,
    title: english(move.names) ?? humanize(move.name),
    type: move.type ? typeRef(labels, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: short ?? latestEnglishFlavor(move.flavor_text_entries) ?? DASH,
    cards,
  };
}

export async function abilityData(name: string) {
  const ability = await apiOrNull(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  const cards = await pokemonCards(
    (ability.pokemon ?? []).map((p: any) => ({ ...p.pokemon, hidden: !!p.is_hidden })),
  );
  return {
    name: ability.name as string,
    title: english(ability.names) ?? humanize(ability.name),
    effect:
      english(ability.effect_entries, "short_effect") ??
      latestEnglishFlavor(ability.flavor_text_entries) ??
      DASH,
    cards,
  };
}

export async function typesData() {
  const types = await allTypes();
  return types.map((t) => ({ name: t.name, label: t.label }));
}

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
] as const;

export async function typeData(name: string) {
  const type = await apiOrNull(`type/${encodeURIComponent(name.toLowerCase())}`);
  if (!type) return null;
  const [labels, cards] = await Promise.all([
    typeLabels(),
    pokemonCards((type.pokemon ?? []).map((p: any) => p.pokemon)),
  ]);
  const moves: { name: string; label: string }[] = (type.moves ?? [])
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  return {
    name: type.name as string,
    title: english(type.names) ?? humanize(type.name),
    relations: RELATIONS.map(([label, key]): { label: string; types: TypeRef[] } => ({
      label,
      types: (type.damage_relations?.[key] ?? [] as any[]).map((t: any) => typeRef(labels, t.name)),
    })),
    cards,
    moves,
  };
}
