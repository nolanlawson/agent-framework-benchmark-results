'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { EM_DASH, humanize, orDash } from '@/lib/format';

export type MoveInfo = {
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};
export type LearnedMove = { move: string; method: string; level: number };

type Props = {
  games: { name: string; label: string }[];
  initialGame?: string;
  moves: Record<string, MoveInfo>;
  learnsets: Record<string, LearnedMove[]>;
};

type Row = MoveInfo & { name: string; level: number };
type Column = 'level' | 'label' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';
type Sort = { column: Column; direction: 'ascending' | 'descending' } | null;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const COLUMNS: { key: Column; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'label', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function compareMethods(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

const byName = (a: Row, b: Row) => a.label.localeCompare(b.label);

function sortRows(rows: Row[], method: string, sort: Sort) {
  if (!sort) {
    return [...rows].sort(method === 'level-up' ? (a, b) => a.level - b.level || byName(a, b) : byName);
  }
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[sort.column];
    const y = b[sort.column];
    // Missing values go last whichever way the column is sorted.
    if (x == null || y == null) return x == null && y == null ? byName(a, b) : x == null ? 1 : -1;
    const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return sign * order || byName(a, b);
  });
}

function MoveTable({ method, rows }: { method: string; rows: Row[] }) {
  const [sort, setSort] = useState<Sort>(null);
  const columns = method === 'level-up' ? COLUMNS : COLUMNS.slice(1);
  const sorted = sortRows(rows, method, sort);

  function toggle(column: Column) {
    setSort((s) =>
      s?.column === column
        ? { column, direction: s.direction === 'ascending' ? 'descending' : 'ascending' }
        : { column, direction: 'ascending' },
    );
  }

  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{humanize(method)}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.column === c.key ? sort.direction : undefined}>
                <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                  {c.label}
                  <span className="sort-indicator" aria-hidden="true">
                    {sort?.column === c.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={`${r.name}-${r.level}`}>
              {method === 'level-up' && <td>{r.level}</td>}
              <td>
                <Link href={`/moves/${r.name}`}>{r.label}</Link>
              </td>
              <td>
                <TypeBadge name={r.type} label={r.typeLabel} link small />
              </td>
              <td>{r.category ?? EM_DASH}</td>
              <td>{orDash(r.power)}</td>
              <td>{orDash(r.accuracy)}</td>
              <td>{orDash(r.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MovesSection({ games, initialGame, moves, learnsets }: Props) {
  const fallback = games[games.length - 1]?.name ?? '';
  const [game, setGame] = useState(
    initialGame && games.some((g) => g.name === initialGame) ? initialGame : fallback,
  );

  function onGameChange(value: string) {
    setGame(value);
    const url = new URL(window.location.href);
    url.searchParams.set('game', value);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const byMethod = new Map<string, Row[]>();
  for (const entry of learnsets[game] ?? []) {
    const info = moves[entry.move];
    if (!info) continue;
    const rows = byMethod.get(entry.method) ?? [];
    rows.push({ ...info, name: entry.move, level: entry.level });
    byMethod.set(entry.method, rows);
  }
  const methods = [...byMethod.keys()].sort(compareMethods);

  return (
    <Section id="moves" title="Moves">
      {games.length === 0 ? (
        <p>{EM_DASH}</p>
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
            <MoveTable key={`${game}-${method}`} method={method} rows={byMethod.get(method)!} />
          ))}
        </>
      )}
    </Section>
  );
}
