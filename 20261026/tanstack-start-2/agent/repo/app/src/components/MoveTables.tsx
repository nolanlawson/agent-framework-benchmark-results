import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { MISSING, orMissing } from '../lib/format'
import type { MoveRow, MoveTable } from '../lib/types'
import { TypeLink } from './TypeBadge'

type Column = {
  key: string
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

type Sort = { key: string; dir: 'ascending' | 'descending' }

function sortRows(rows: MoveRow[], column: Column, dir: Sort['dir']) {
  const sign = dir === 'ascending' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((a, b) => {
      const aMissing = a.value === null || a.value === undefined
      const bMissing = b.value === null || b.value === undefined
      // Missing values go last in both directions.
      if (aMissing || bMissing) return aMissing === bMissing ? a.index - b.index : aMissing ? 1 : -1
      const cmp =
        typeof a.value === 'number' && typeof b.value === 'number'
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value))
      return cmp * sign || a.index - b.index
    })
    .map((x) => x.row)
}

function MovesTable({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<Sort | null>(null)
  const columns = table.method === 'level-up' ? COLUMNS : COLUMNS.slice(1)
  const active = sort && columns.find((c) => c.key === sort.key)
  const rows = active ? sortRows(table.rows, active, sort.dir) : table.rows

  const toggle = (key: string) =>
    setSort((s) => ({ key, dir: s?.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' }))

  return (
    <div className="table-scroll">
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
            <tr key={`${r.name}-${r.level}-${i}`}>
              {table.method === 'level-up' && <td>{orMissing(r.level)}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: r.name }}>
                  {r.label}
                </Link>
              </td>
              <td>
                <TypeLink type={r.type} />
              </td>
              <td>{r.category ?? MISSING}</td>
              <td>{orMissing(r.power)}</td>
              <td>{orMissing(r.accuracy)}</td>
              <td>{orMissing(r.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MoveTables({ tables }: { tables: MoveTable[] }) {
  return (
    <>
      {tables.map((t) => (
        <MovesTable key={t.method} table={t} />
      ))}
    </>
  )
}
