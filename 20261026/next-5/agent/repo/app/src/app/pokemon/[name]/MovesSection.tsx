'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TypeBadge } from '@/components/TypeBadge';
import { humanize, MISSING } from '@/lib/format';

export type Game = { name: string; label: string };
export type MoveInfo = {
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};
/** [move name, version group name, learn method name, level] */
export type Learn = [string, string, string, number];

type Row = { key: string; move: string; level: number; info: MoveInfo };
type ColumnKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Sort = { key: ColumnKey; dir: 'ascending' | 'descending' } | null;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const COLUMNS: { key: ColumnKey; label: string; value: (r: Row) => string | number | null }[] = [
  { key: 'level', label: 'Level', value: (r) => r.level },
  { key: 'move', label: 'Move', value: (r) => r.info.label },
  { key: 'type', label: 'Type', value: (r) => r.info.typeLabel },
  { key: 'category', label: 'Category', value: (r) => r.info.category },
  { key: 'power', label: 'Power', value: (r) => r.info.power },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.info.accuracy },
  { key: 'pp', label: 'PP', value: (r) => r.info.pp },
];

function compareValues(a: string | number | null, b: string | number | null): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function compareMethods(a: string, b: string): number {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

function MoveTable({ method, rows }: { method: string; rows: Row[] }) {
  const [sort, setSort] = useState<Sort>(null);
  const columns = method === 'level-up' ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');

  let sorted = rows;
  if (sort) {
    const column = COLUMNS.find((c) => c.key === sort.key)!;
    const sign = sort.dir === 'ascending' ? 1 : -1;
    sorted = [...rows].sort((a, b) => {
      const va = column.value(a);
      const vb = column.value(b);
      const missingA = va === null || va === undefined;
      const missingB = vb === null || vb === undefined;
      if (missingA || missingB) return Number(missingA) - Number(missingB);
      return sign * compareValues(va, vb);
    });
  }

  const toggle = (key: ColumnKey) =>
    setSort((s) => ({ key, dir: s?.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' }));

  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{humanize(method)}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? sort.dir : undefined}>
                <button type="button" onClick={() => toggle(c.key)}>
                  {c.label}
                  {sort?.key === c.key && (
                    <span className="sort-indicator" aria-hidden="true">
                      {sort.dir === 'ascending' ? '▲' : '▼'}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.key}>
              {method === 'level-up' && <td>{r.level}</td>}
              <td>
                <Link href={`/moves/${r.move}`} prefetch={false}>
                  {r.info.label}
                </Link>
              </td>
              <td>
                <TypeBadge name={r.info.type} label={r.info.typeLabel} link />
              </td>
              <td>{r.info.category ?? MISSING}</td>
              <td>{r.info.power ?? MISSING}</td>
              <td>{r.info.accuracy ?? MISSING}</td>
              <td>{r.info.pp ?? MISSING}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MovesSection({
  games,
  moves,
  learns,
  initialGame,
}: {
  games: Game[];
  moves: Record<string, MoveInfo>;
  learns: Learn[];
  initialGame?: string;
}) {
  const searchParams = useSearchParams();
  const isGame = (name: string | null | undefined) => !!name && games.some((g) => g.name === name);
  const fromUrl = searchParams.get('game');
  const game = isGame(fromUrl) ? fromUrl! : isGame(initialGame) ? initialGame! : games.at(-1)?.name;

  const changeGame = (name: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('game', name);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };

  const byMethod = new Map<string, Row[]>();
  for (const [move, vg, method, level] of learns) {
    if (vg !== game || !moves[move]) continue;
    const rows = byMethod.get(method) ?? [];
    rows.push({ key: `${move}-${level}-${rows.length}`, move, level, info: moves[move] });
    byMethod.set(method, rows);
  }
  const methods = [...byMethod.keys()].sort(compareMethods);
  for (const method of methods) {
    byMethod.get(method)!.sort((a, b) =>
      method === 'level-up' ? a.level - b.level || a.info.label.localeCompare(b.info.label) : a.info.label.localeCompare(b.info.label),
    );
  }

  return (
    <section id="moves" aria-labelledby="moves-heading" className="panel">
      <h2 id="moves-heading">Moves</h2>
      {games.length === 0 ? (
        <p>{MISSING}</p>
      ) : (
        <>
          <div className="game-picker">
            <label htmlFor="game">Game</label>
            <select id="game" value={game} onChange={(e) => changeGame(e.target.value)}>
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
    </section>
  );
}
