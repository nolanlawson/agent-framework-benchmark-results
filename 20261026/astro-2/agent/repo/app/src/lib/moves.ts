import { englishName, getJson, getTypeLabels, humanize } from './api';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export type MoveRow = {
  level: number | null;
  name: string;
  label: string;
  type: { name: string; label: string } | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

export type MoveTablesData = {
  games: { name: string; label: string }[];
  selected: string | null;
  tables: MoveTable[];
};

function methodRank(method: string) {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

/** The Pokémon's learnable moves for one version group, grouped into a table per learn method. */
export async function getMoveTables(pokemon: any, requestedGame: string | null): Promise<MoveTablesData> {
  const groupUrls = new Map<string, string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) groupUrls.set(d.version_group.name, d.version_group.url);
  }
  const groups = await Promise.all(
    [...groupUrls].map(async ([name, url]) => ({ name, order: (await getJson(url))?.order ?? Number.MAX_SAFE_INTEGER })),
  );
  groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const games = groups.map((g) => ({ name: g.name, label: humanize(g.name) }));
  const selected = games.some((g) => g.name === requestedGame) ? requestedGame : (games[games.length - 1]?.name ?? null);

  const learned: { move: { name: string; url: string }; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue;
      const key = `${d.move_learn_method.name}|${m.move.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learned.push({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const [typeLabels, moveRecords] = await Promise.all([
    getTypeLabels(),
    Promise.all([...new Set(learned.map((l) => l.move.url))].map(async (url) => [url, await getJson(url)] as const)),
  ]);
  const moves = new Map(moveRecords);

  const byMethod = new Map<string, MoveRow[]>();
  for (const l of learned) {
    const move = moves.get(l.move.url);
    const row: MoveRow = {
      level: l.method === 'level-up' ? l.level : null,
      name: l.move.name,
      label: move ? englishName(move) : humanize(l.move.name),
      type: move?.type ? { name: move.type.name, label: typeLabels.get(move.type.name) ?? humanize(move.type.name) } : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    const rows = byMethod.get(l.method) ?? [];
    rows.push(row);
    byMethod.set(l.method, rows);
  }

  const tables = [...byMethod]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));

  return { games, selected, tables };
}
