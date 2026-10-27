// Server-side assembly of page data from the API.
import { apiGet, apiList, isApiName } from './api.js';
import { englishName, humanize, idFromUrl, latestEnglishFlavorText } from './format.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const isDefaultForm = (id) => Number.isInteger(id) && id > 0 && id < 10000;

const typeRef = (types, name) => ({ name, label: types.labels.get(name) ?? humanize(name) });

// MARK: Shared indexes

export async function getSpecies() {
  const list = await apiList('pokemon-species');
  const species = list
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter((s) => isDefaultForm(s.id))
    .sort((a, b) => a.id - b.id);
  return { list: species, byId: new Map(species.map((s) => [s.id, s])) };
}

// The 18 types in API order, with their full records.
export async function getTypes() {
  const list = (await apiList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(list.map((t) => apiGet(t.url)));
  const types = records.filter(Boolean).map((record) => ({ name: record.name, label: englishName(record), record }));
  return { list: types, labels: new Map(types.map((t) => [t.name, t.label])) };
}

export async function getGenerations() {
  const list = await apiList('generation');
  const records = await Promise.all(list.map((g) => apiGet(g.url)));
  return records
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)
    .map((record) => ({ name: record.name, label: englishName(record), record }));
}

async function getVersionGroups() {
  const list = await apiList('version-group');
  const records = await Promise.all(list.map((v) => apiGet(v.url)));
  return new Map(records.filter(Boolean).map((r) => [r.name, r.order ?? Infinity]));
}

// Pokémon references (from types, moves, abilities) as species cards, sorted by dex number.
function toCards(refs, species, extra = () => ({})) {
  const cards = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!isDefaultForm(id) || cards.has(id)) continue;
    const name = species.byId.get(id)?.name ?? ref.pokemon.name;
    cards.set(id, { id, name, ...extra(ref) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

// MARK: Home

// Compact index of every species for the browser: [id, name, generation index, ...type indexes].
export async function getHomeIndex() {
  const [species, types, generations] = await Promise.all([getSpecies(), getTypes(), getGenerations()]);

  const typesById = new Map();
  types.list.forEach((type, typeIndex) => {
    for (const { slot, pokemon } of type.record.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!isDefaultForm(id)) continue;
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id).push([slot, typeIndex]);
    }
  });

  const generationByName = new Map();
  generations.forEach((generation, index) => {
    for (const s of generation.record.pokemon_species) generationByName.set(s.name, index);
  });

  return {
    types: types.list.map(({ name, label }) => ({ name, label })),
    generations: generations.map(({ name, label }) => ({ name, label })),
    species: species.list.map(({ id, name }) => [
      id,
      name,
      generationByName.get(name) ?? -1,
      ...(typesById.get(id) ?? []).sort((a, b) => a[0] - b[0]).map(([, typeIndex]) => typeIndex),
    ]),
  };
}

// MARK: Pokémon

function evolutionTree(node) {
  return { name: node.species.name, evolvesTo: (node.evolves_to ?? []).map(evolutionTree) };
}

function compactMove(record, types) {
  return {
    label: englishName(record),
    type: record.type?.name ?? null,
    typeLabel: record.type ? typeRef(types, record.type.name).label : null,
    category: record.damage_class ? humanize(record.damage_class.name) : null,
    power: record.power ?? null,
    accuracy: record.accuracy ?? null,
    pp: record.pp ?? null,
  };
}

export async function getPokemonPage(name, requestedGame) {
  if (!isApiName(name)) return null;
  const species = await apiGet(`pokemon-species/${name.toLowerCase()}`);
  if (!species || !isDefaultForm(species.id)) return null;

  const defaultVariety = species.varieties?.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, types, versionGroups] = await Promise.all([
    apiGet(defaultVariety?.url ?? `pokemon/${species.id}`),
    species.evolution_chain ? apiGet(species.evolution_chain.url) : null,
    getTypes(),
    getVersionGroups(),
  ]);
  if (!pokemon) return null;

  const moveRecords = await Promise.all(pokemon.moves.map((m) => apiGet(m.move.url)));
  const moves = {};
  const learn = {};
  pokemon.moves.forEach((entry, i) => {
    const record = moveRecords[i];
    moves[entry.move.name] = record ? compactMove(record, types) : { label: humanize(entry.move.name) };
    for (const detail of entry.version_group_details) {
      const group = detail.version_group.name;
      (learn[group] ??= []).push([entry.move.name, detail.move_learn_method.name, detail.level_learned_at]);
    }
  });
  const groups = Object.keys(learn)
    .sort((a, b) => (versionGroups.get(a) ?? Infinity) - (versionGroups.get(b) ?? Infinity))
    .map((group) => ({ name: group, label: humanize(group) }));
  const selected = groups.some((g) => g.name === requestedGame) ? requestedGame : groups.at(-1)?.name ?? null;

  const genus = species.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;

  return {
    id: species.id,
    name: species.name,
    title: englishName(species),
    genus,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(types, t.type.name)),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    stats: pokemon.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain ? evolutionTree(chain.chain) : { name: species.name, evolvesTo: [] },
    moves: { groups, selected, moves, learn },
  };
}

// MARK: Moves

export async function getMovePage(name) {
  if (!isApiName(name)) return null;
  const [move, types, species] = await Promise.all([apiGet(`move/${name.toLowerCase()}`), getTypes(), getSpecies()]);
  if (!move) return null;
  const shortEffect = move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect;
  return {
    name: move.name,
    title: englishName(move),
    type: move.type ? typeRef(types, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: shortEffect || latestEnglishFlavorText(move.flavor_text_entries),
    pokemon: toCards((move.learned_by_pokemon ?? []).map((p) => ({ pokemon: p })), species),
  };
}

// MARK: Abilities

export async function getAbilityPage(name) {
  if (!isApiName(name)) return null;
  const [ability, species] = await Promise.all([apiGet(`ability/${name.toLowerCase()}`), getSpecies()]);
  if (!ability) return null;
  return {
    name: ability.name,
    title: englishName(ability),
    effect:
      ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ??
      latestEnglishFlavorText(ability.flavor_text_entries),
    pokemon: toCards(ability.pokemon ?? [], species, (ref) => ({ hidden: ref.is_hidden })),
  };
}

// MARK: Types

export async function getTypesPage() {
  const types = await getTypes();
  return { types: types.list.map(({ name, label }) => ({ name, label })) };
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function getTypePage(name) {
  if (!isApiName(name)) return null;
  const [type, types, species] = await Promise.all([apiGet(`type/${name.toLowerCase()}`), getTypes(), getSpecies()]);
  if (!type) return null;
  return {
    name: type.name,
    title: englishName(type),
    relations: RELATIONS.map(([label, key]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((t) => typeRef(types, t.name)),
    })),
    pokemon: toCards(type.pokemon ?? [], species),
    moves: (type.moves ?? [])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
