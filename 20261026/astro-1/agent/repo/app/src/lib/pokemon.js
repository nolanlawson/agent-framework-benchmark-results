import { getByName, getJSON, apiPath, getTypeLabels, typeLabel, mapLimit } from './api.js';
import { englishName, englishGenus, humanize, latestFlavorText, idFromUrl, STAT_LABELS } from './format.js';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function compareMethods(a, b) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

const byLabel = (a, b) => a.label.localeCompare(b.label);

export async function loadPokemonPage(name, requestedGame) {
  const species = await getByName('pokemon-species', name);
  if (!species) return null;

  const variety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, typeLabels, chain] = await Promise.all([
    getJSON(variety ? apiPath(variety.pokemon.url) : `pokemon/${species.id}/`),
    getTypeLabels(),
    species.evolution_chain?.url ? getJSON(apiPath(species.evolution_chain.url)) : null,
  ]);
  if (!pokemon) return null;

  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => ({ name: t.type.name, label: typeLabel(typeLabels, t.type.name) }));

  const stats = pokemon.stats.map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  const abilities = [...pokemon.abilities]
    .sort((a, b) => a.slot - b.slot)
    .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden }));

  const moves = await loadMoves(pokemon, requestedGame, typeLabels);

  return {
    id: species.id,
    name: species.name,
    title: englishName(species),
    genus: englishGenus(species),
    flavor: latestFlavorText(species),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types,
    stats,
    abilities,
    chain: chain?.chain ?? { species: { name: species.name }, evolves_to: [] },
    ...moves,
  };
}

async function loadMoves(pokemon, requestedGame, typeLabels) {
  // version group -> learn entries
  const byGame = new Map();
  for (const { move, version_group_details } of pokemon.moves) {
    for (const d of version_group_details) {
      const game = d.version_group.name;
      if (!byGame.has(game)) byGame.set(game, { url: d.version_group.url, entries: [] });
      byGame.get(game).entries.push({ move, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const gameRecords = await Promise.all([...byGame.values()].map((g) => getJSON(apiPath(g.url))));
  const games = [...byGame.keys()]
    .map((name, i) => ({ name, label: humanize(name), order: gameRecords[i]?.order ?? idFromUrl(byGame.get(name).url) }))
    .sort((a, b) => a.order - b.order);

  const selected = games.find((g) => g.name === requestedGame) ?? games[games.length - 1];
  if (!selected) return { games, game: null, tables: [] };

  const entries = byGame.get(selected.name).entries;
  const uniqueMoves = [...new Map(entries.map((e) => [e.move.name, e.move])).values()];
  const records = await mapLimit(uniqueMoves, 24, (m) => getJSON(apiPath(m.url)));
  const details = new Map(uniqueMoves.map((m, i) => [m.name, records[i]]));

  const tables = new Map();
  const seen = new Set();
  for (const { move, method, level } of entries) {
    const key = `${method}|${move.name}|${method === 'level-up' ? level : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const record = details.get(move.name);
    if (!tables.has(method)) tables.set(method, []);
    tables.get(method).push({
      level: method === 'level-up' ? level : null,
      name: move.name,
      label: record ? englishName(record) : humanize(move.name),
      type: record?.type ? { name: record.type.name, label: typeLabel(typeLabels, record.type.name) } : null,
      category: record?.damage_class ? humanize(record.damage_class.name) : null,
      power: record?.power ?? null,
      accuracy: record?.accuracy ?? null,
      pp: record?.pp ?? null,
    });
  }

  return {
    games,
    game: selected.name,
    tables: [...tables.keys()].sort(compareMethods).map((method) => {
      const rows = tables.get(method);
      rows.sort(method === 'level-up' ? (a, b) => a.level - b.level || byLabel(a, b) : byLabel);
      return { method, label: humanize(method), rows };
    }),
  };
}
