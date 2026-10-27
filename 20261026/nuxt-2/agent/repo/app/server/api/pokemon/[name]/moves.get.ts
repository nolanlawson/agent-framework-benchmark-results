import type { MoveRow, MoveTable, PokemonMovesData } from '#shared/types/pokedex'

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

interface LearnDetail {
  level_learned_at: number
  version_group: { name: string }
  move_learn_method: { name: string }
}

function compareRows(a: MoveRow, b: MoveRow): number {
  return (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)
}

export default defineEventHandler(async (event): Promise<PokemonMovesData> => {
  const { pokemon } = await speciesWithPokemon(getRouterParam(event, 'name') ?? '')
  const moves: { move: { name: string }; version_group_details: LearnDetail[] }[] = pokemon.moves ?? []

  // Version groups in which the Pokémon learns moves, ordered by the version group's order.
  const groupNames = [...new Set(moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))]
  const groups = await mapLimit(groupNames, (name) => fetchApi(`version-group/${name}/`))
  const games = groupNames
    .map((name, i) => ({ name, order: groups[i]?.order ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.order - b.order)
    .map(({ name }) => ({ name, label: humanize(name) }))

  const requested = getQuery(event).game
  const game = games.find((g) => g.name === requested)?.name ?? games[games.length - 1]?.name ?? null
  if (!game) return { games, game, tables: [] }

  const learned = moves.flatMap((m) =>
    m.version_group_details.filter((d) => d.version_group.name === game).map((d) => ({ move: m.move.name, detail: d })),
  )
  const moveNames = [...new Set(learned.map((l) => l.move))]
  const [labels, details] = await Promise.all([typeLabels(), mapLimit(moveNames, (name) => fetchApi(`move/${name}/`))])
  const moveInfo = new Map(moveNames.map((name, i) => [name, details[i]]))

  const tables = new Map<string, { rows: MoveRow[]; seen: Set<string> }>()
  for (const { move, detail } of learned) {
    const method = detail.move_learn_method.name
    const level = method === 'level-up' ? detail.level_learned_at : null
    const table = tables.get(method) ?? { rows: [], seen: new Set() }
    tables.set(method, table)
    const key = `${move}:${level}`
    if (table.seen.has(key)) continue
    table.seen.add(key)
    const info = moveInfo.get(move)
    table.rows.push({
      level,
      name: move,
      label: englishName(info?.names, move),
      type: info?.type ? typeRef(info.type.name, labels) : null,
      category: info?.damage_class ? humanize(info.damage_class.name) : null,
      power: info?.power ?? null,
      accuracy: info?.accuracy ?? null,
      pp: info?.pp ?? null,
    })
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method)
    return i === -1 ? METHOD_ORDER.length : i
  }
  const result: MoveTable[] = [...tables.entries()]
    .map(([method, { rows }]) => ({ method, label: humanize(method), rows: rows.sort(compareRows) }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label))

  return { games, game, tables: result }
})
