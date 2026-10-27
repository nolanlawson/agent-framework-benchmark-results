'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DASH, humanize, orDash } from '@/lib/format';
import { TypeBadge } from './TypeBadge';

export interface GameOption {
  name: string;
  label: string;
}

export interface MoveInfo {
  name: string;
  displayName: string;
  type: string;
  damageClass: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

/** [learn method, level learned at, move name] */
export type LearnedMove = [string, number, string];

type ColumnKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

interface Row {
  key: string;
  level: number;
  move: MoveInfo;
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodRank(method: string) {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function sortValue(row: Row, key: ColumnKey, typeNames: Record<string, string>): string | number | null {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.move.displayName;
    case 'type':
      return typeNames[row.move.type] ?? humanize(row.move.type);
    case 'category':
      return row.move.damageClass ? humanize(row.move.damageClass) : null;
    case 'power':
      return row.move.power;
    case 'accuracy':
      return row.move.accuracy;
    case 'pp':
      return row.move.pp;
  }
}

function compareValues(a: string | number | null, b: string | number | null) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function MoveTable({
  method,
  rows,
  typeNames,
}: {
  method: string;
  rows: Row[];
  typeNames: Record<string, string>;
}) {
  const [sort, setSort] = useState<{ key: ColumnKey; direction: Direction } | null>(null);
  const isLevelUp = method === 'level-up';
  const columns = isLevelUp ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');

  const byName = (a: Row, b: Row) => a.move.displayName.localeCompare(b.move.displayName) || a.level - b.level;
  const sorted = [...rows].sort((a, b) => {
    if (sort) {
      const va = sortValue(a, sort.key, typeNames);
      const vb = sortValue(b, sort.key, typeNames);
      // Missing values go last in both directions.
      if (va === null && vb !== null) return 1;
      if (vb === null && va !== null) return -1;
      if (va !== null && vb !== null) {
        const cmp = compareValues(va, vb);
        if (cmp !== 0) return sort.direction === 'ascending' ? cmp : -cmp;
      }
      return byName(a, b);
    }
    return isLevelUp ? a.level - b.level || byName(a, b) : byName(a, b);
  });

  function toggle(key: ColumnKey) {
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' },
    );
  }

  const title = humanize(method);
  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{title}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key ? sort.direction : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={active}>
                  <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span className="sort-indicator" aria-hidden="true">
                      {active === 'ascending' ? '▲' : active === 'descending' ? '▼' : ''}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              {isLevelUp && <td>{row.level}</td>}
              <td>
                <Link href={`/moves/${row.move.name}`}>{row.move.displayName}</Link>
              </td>
              <td>
                <TypeBadge type={row.move.type} label={typeNames[row.move.type] ?? humanize(row.move.type)} />
              </td>
              <td>{row.move.damageClass ? humanize(row.move.damageClass) : DASH}</td>
              <td>{orDash(row.move.power)}</td>
              <td>{orDash(row.move.accuracy)}</td>
              <td>{orDash(row.move.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MovesSection({
  games,
  initialGame,
  learned,
  moves,
  typeNames,
}: {
  games: GameOption[];
  initialGame: string;
  learned: Record<string, LearnedMove[]>;
  moves: Record<string, MoveInfo>;
  typeNames: Record<string, string>;
}) {
  const [game, setGame] = useState(initialGame);

  const byMethod = new Map<string, Row[]>();
  const seen = new Set<string>();
  for (const [method, level, moveName] of learned[game] ?? []) {
    const move = moves[moveName];
    const key = `${method}:${level}:${moveName}`;
    if (!move || seen.has(key)) continue;
    seen.add(key);
    if (!byMethod.has(method)) byMethod.set(method, []);
    byMethod.get(method)!.push({ key, level, move });
  }
  const methods = [...byMethod.keys()].sort(
    (a, b) => methodRank(a) - methodRank(b) || humanize(a).localeCompare(humanize(b)),
  );

  function onGameChange(value: string) {
    setGame(value);
    const url = new URL(window.location.href);
    url.searchParams.set('game', value);
    window.history.replaceState(null, '', url);
  }

  return (
    <section id="moves" aria-labelledby="moves-heading" className="panel">
      <h2 id="moves-heading" className="panel-title">
        Moves
      </h2>
      {games.length === 0 ? (
        <p className="muted">This Pokémon learns no moves.</p>
      ) : (
        <>
          <div className="game-picker">
            <label htmlFor="game">Game</label>
            <select id="game" value={game} onChange={(e) => onGameChange(e.target.value)}>
              {games.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          {methods.map((method) => (
            <MoveTable key={`${game}:${method}`} method={method} rows={byMethod.get(method)!} typeNames={typeNames} />
          ))}
        </>
      )}
    </section>
  );
}
