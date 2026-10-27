// Builds the per-version-group move tables shown on a Pokémon page.

import { getMove, versionGroups, englishName, typeNames, type PokemonData } from './data.js'
import { humanize } from './util.js'

export type MoveRow = {
  level: number
  name: string
  label: string
  type: string
  typeLabel: string
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveTable = { method: string; label: string; rows: MoveRow[] }

export const COLUMNS = ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp'] as const
export type Column = (typeof COLUMNS)[number]
export type Dir = 'ascending' | 'descending'
export type Sort = { column: Column; dir: Dir } | undefined

export const COLUMN_LABELS: Record<Column, string> = {
  level: 'Level',
  move: 'Move',
  type: 'Type',
  category: 'Category',
  power: 'Power',
  accuracy: 'Accuracy',
  pp: 'PP',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

/** Version groups the Pokémon learns moves in, ordered by the version group's `order`. */
export async function gamesFor(pokemon: PokemonData): Promise<{ name: string; label: string }[]> {
  const used = new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))
  const groups = await versionGroups()
  return groups
    .filter((g) => used.has(g.name))
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ name: g.name, label: humanize(g.name) }))
}

export async function moveTables(pokemon: PokemonData, game: string): Promise<MoveTable[]> {
  const entries = pokemon.moves.flatMap((m) =>
    m.version_group_details.filter((d) => d.version_group.name === game).map((d) => ({ move: m.move.name, detail: d })),
  )
  const names = [...new Set(entries.map((e) => e.move))]
  const [moves, types] = await Promise.all([Promise.all(names.map((n) => getMove(n))), typeNames()])
  const byName = new Map(names.map((n, i) => [n, moves[i]]))

  const tables = new Map<string, MoveTable>()
  const seen = new Set<string>()
  for (const { move, detail } of entries) {
    const data = byName.get(move)
    if (!data) continue
    const method = detail.move_learn_method.name
    const level = detail.level_learned_at
    const key = `${method}|${move}|${method === 'level-up' ? level : ''}`
    if (seen.has(key)) continue
    seen.add(key)
    let table = tables.get(method)
    if (!table) tables.set(method, (table = { method, label: humanize(method), rows: [] }))
    table.rows.push({
      level,
      name: data.name,
      label: englishName(data),
      type: data.type.name,
      typeLabel: types.get(data.type.name) ?? humanize(data.type.name),
      category: data.damage_class ? humanize(data.damage_class.name) : null,
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
    })
  }

  const rank = (m: MoveTable) => {
    const i = METHOD_ORDER.indexOf(m.method)
    return i === -1 ? METHOD_ORDER.length : i
  }
  return [...tables.values()]
    .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label))
    .map((t) => ({ ...t, rows: sortRows(t.rows, t.method, undefined) }))
}

const byLabel = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label)

function value(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case 'level':
      return row.level
    case 'move':
      return row.label
    case 'type':
      return row.typeLabel
    case 'category':
      return row.category
    default:
      return row[column]
  }
}

export function sortRows(rows: MoveRow[], method: string, sort: Sort): MoveRow[] {
  const sorted = [...rows]
  if (!sort) {
    return sorted.sort(method === 'level-up' ? (a, b) => a.level - b.level || byLabel(a, b) : byLabel)
  }
  const sign = sort.dir === 'ascending' ? 1 : -1
  return sorted.sort((a, b) => {
    const va = value(a, sort.column)
    const vb = value(b, sort.column)
    // Missing values sort last in both directions.
    if (va === null || vb === null) return va === vb ? byLabel(a, b) : va === null ? 1 : -1
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sign * cmp || byLabel(a, b)
  })
}

export function parseSort(column: string | undefined, dir: string | undefined): Sort {
  if (!column || !(COLUMNS as readonly string[]).includes(column)) return undefined
  return { column: column as Column, dir: dir === 'descending' ? 'descending' : 'ascending' }
}
