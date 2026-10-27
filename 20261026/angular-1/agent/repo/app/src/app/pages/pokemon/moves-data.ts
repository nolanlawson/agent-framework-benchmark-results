import { englishName, humanize } from '../../core/format';
import { Pokemon } from '../../core/models';
import { PokeApi, TypeLabel } from '../../core/poke-api';

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeLabel;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTable {
  method: string;
  label: string;
  showLevel: boolean;
  rows: MoveRow[];
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodRank(method: string): number {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
}

/** One table per learn method for the moves the Pokémon learns in a version group. */
export async function loadMoveTables(api: PokeApi, pokemon: Pokemon, game: string): Promise<MoveTable[]> {
  const learned: { move: string; method: string; level: number }[] = [];
  for (const { move, version_group_details } of pokemon.moves) {
    const seen = new Set<string>();
    for (const detail of version_group_details) {
      if (detail.version_group.name !== game) continue;
      const method = detail.move_learn_method.name;
      const key = `${method}:${method === 'level-up' ? detail.level_learned_at : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learned.push({ move: move.name, method, level: detail.level_learned_at });
    }
  }

  const moveNames = [...new Set(learned.map((l) => l.move))];
  const moves = new Map(
    await Promise.all(moveNames.map(async (name) => [name, await api.move(name).catch(() => null)] as const)),
  );
  const typeNames = [...new Set([...moves.values()].flatMap((m) => (m ? [m.type.name] : [])))];
  const typeLabels = new Map((await api.typeLabels(typeNames.map((name) => ({ name, url: '' })))).map((t) => [t.name, t]));

  const tables = new Map<string, MoveTable>();
  for (const { move: name, method, level } of learned) {
    const move = moves.get(name);
    const typeName = move?.type.name ?? 'unknown';
    let table = tables.get(method);
    if (!table) {
      table = { method, label: humanize(method), showLevel: method === 'level-up', rows: [] };
      tables.set(method, table);
    }
    table.rows.push({
      level: method === 'level-up' ? level : null,
      name,
      label: move ? englishName(move.names, name) : humanize(name),
      type: typeLabels.get(typeName) ?? { name: typeName, label: humanize(typeName) },
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    });
  }

  for (const table of tables.values()) {
    table.rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
  }
  return [...tables.values()].sort(
    (a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label),
  );
}
