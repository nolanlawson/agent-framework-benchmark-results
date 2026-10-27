import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { orDash } from '../lib/format'
import type { MoveRow, MoveTable } from '../lib/types'
import { TypeBadge } from './TypeBadge'

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type Direction = 'ascending' | 'descending'

const COLUMNS: Array<{ key: Column; label: string }> = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

function sortValue(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case 'level':
      return row.level ?? null
    case 'move':
      return row.label
    case 'type':
      return row.type?.label ?? null
    case 'category':
      return row.category
    case 'power':
      return row.power
    case 'accuracy':
      return row.accuracy
    case 'pp':
      return row.pp
  }
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label)

function sortRows(rows: MoveRow[], column: Column | null, direction: Direction, isLevelUp: boolean): MoveRow[] {
  const sorted = [...rows]
  if (!column) {
    return sorted.sort(isLevelUp ? (a, b) => (a.level ?? 0) - (b.level ?? 0) || byName(a, b) : byName)
  }
  const sign = direction === 'ascending' ? 1 : -1
  return sorted.sort((a, b) => {
    const va = sortValue(a, column)
    const vb = sortValue(b, column)
    // Missing values always go last, whichever the direction.
    if (va === null || vb === null) {
      if (va === null && vb === null) return byName(a, b)
      return va === null ? 1 : -1
    }
    return sign * compareValues(va, vb) || byName(a, b)
  })
}

export function MoveTableView({ table }: { table: MoveTable }) {
  const isLevelUp = table.method === 'level-up'
  const columns = isLevelUp ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level')
  const [sort, setSort] = useState<{ column: Column | null; direction: Direction }>({
    column: null,
    direction: 'ascending',
  })
  const rows = useMemo(
    () => sortRows(table.rows, sort.column, sort.direction, isLevelUp),
    [table.rows, sort, isLevelUp],
  )

  const toggle = (column: Column) =>
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' }
        : { column, direction: 'ascending' },
    )

  return (
    <div className="move-table">
      <div className="table-scroll">
        <table>
          <caption>{table.label}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.column === c.key ? sort.direction : undefined}>
                  <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span className="sort-indicator" aria-hidden="true">
                      {sort.column === c.key ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.name}-${row.level ?? ''}-${i}`}>
                {isLevelUp && <td>{orDash(row.level)}</td>}
                <td>
                  <Link to="/moves/$name" params={{ name: row.name }}>
                    {row.label}
                  </Link>
                </td>
                <td>{row.type ? <TypeBadge type={row.type} /> : '—'}</td>
                <td>{orDash(row.category)}</td>
                <td>{orDash(row.power)}</td>
                <td>{orDash(row.accuracy)}</td>
                <td>{orDash(row.pp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
