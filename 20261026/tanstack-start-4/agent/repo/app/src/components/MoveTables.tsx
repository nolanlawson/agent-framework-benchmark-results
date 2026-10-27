import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { orDash } from '../lib/format'
import type { MoveRow, MoveTable } from '../lib/types'
import { TypeBadge } from './TypeBadge'

type Column = {
  key: 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
  label: string
  value: (row: MoveRow) => string | number | null
}

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level', value: (r) => r.level },
  { key: 'move', label: 'Move', value: (r) => r.label },
  { key: 'type', label: 'Type', value: (r) => r.type.label },
  { key: 'category', label: 'Category', value: (r) => r.category },
  { key: 'power', label: 'Power', value: (r) => r.power },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.accuracy },
  { key: 'pp', label: 'PP', value: (r) => r.pp },
]

type Sort = { key: Column['key']; dir: 'ascending' | 'descending' }

export function MoveTables({ tables }: { tables: MoveTable[] }) {
  return (
    <>
      {tables.map((t) => (
        <SortableMoveTable key={t.method} table={t} />
      ))}
    </>
  )
}

function compare(a: string | number | null, b: string | number | null, dir: Sort['dir']): number {
  // Missing values always go last, whichever the direction.
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return dir === 'ascending' ? result : -result
}

function SortableMoveTable({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<Sort | null>(null)
  const columns = table.method === 'level-up' ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level')

  const rows = useMemo(() => {
    if (!sort) return table.rows
    const col = COLUMNS.find((c) => c.key === sort.key)!
    // Ties keep the default order (stable sort).
    return [...table.rows].sort((a, b) => compare(col.value(a), col.value(b), sort.dir))
  }, [table.rows, sort])

  const toggle = (key: Column['key']) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'ascending' ? 'descending' : 'ascending' } : { key, dir: 'ascending' }))

  return (
    <div className="table-wrap">
      <table className="moves">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? sort.dir : undefined}>
                <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                  {c.label}
                  <span className="sort-indicator" aria-hidden="true">
                    {sort?.key === c.key ? (sort.dir === 'ascending' ? '▲' : '▼') : ''}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${r.level ?? ''}-${i}`}>
              {table.method === 'level-up' && <td>{orDash(r.level)}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: r.name }}>
                  {r.label}
                </Link>
              </td>
              <td>{r.type.name === 'unknown' ? '—' : <TypeBadge type={r.type} />}</td>
              <td>{orDash(r.category)}</td>
              <td>{orDash(r.power)}</td>
              <td>{orDash(r.accuracy)}</td>
              <td>{orDash(r.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
