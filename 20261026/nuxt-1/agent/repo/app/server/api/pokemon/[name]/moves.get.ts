import type { MoveRow, MoveTable, PokemonMoves } from '#shared/types'

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

interface MoveEntry {
  move: { name: string }
  version_group_details: { level_learned_at: number; version_group: { name: string }; move_learn_method: { name: string } }[]
}

export default defineEventHandler(async (event): Promise<PokemonMoves> => {
  const [{ pokemon }, index, order] = await Promise.all([
    getSpeciesAndPokemon(getRouterParam(event, 'name')),
    getIndex(),
    versionGroupOrder(),
  ])
  const moves = pokemon.moves as MoveEntry[]

  const gameNames = new Set(moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))
  const games = [...gameNames]
    .sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b))
    .map((name) => ({ name, label: humanize(name) }))
  const requested = String(getQuery(event).game ?? '')
  const selected = gameNames.has(requested) ? requested : (games[games.length - 1]?.name ?? null)

  const byMethod = new Map<string, { move: string; level: number }[]>()
  for (const m of moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue
      const method = d.move_learn_method.name
      const list = byMethod.get(method) ?? []
      if (!list.some((x) => x.move === m.move.name && x.level === d.level_learned_at)) list.push({ move: m.move.name, level: d.level_learned_at })
      byMethod.set(method, list)
    }
  }

  const names = [...new Set([...byMethod.values()].flat().map((x) => x.move))]
  const summaries = new Map(await Promise.all(names.map(async (n) => [n, await moveSummary(n, index)] as const)))

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method)
    return i === -1 ? METHOD_ORDER.length : i
  }
  const tables: MoveTable[] = [...byMethod.entries()]
    .map(([method, entries]) => {
      const isLevelUp = method === 'level-up'
      const rows: MoveRow[] = entries.map(({ move, level }) => ({
        name: move,
        label: humanize(move),
        type: null,
        category: null,
        power: null,
        accuracy: null,
        pp: null,
        ...summaries.get(move),
        level: isLevelUp ? level : null,
      }))
      rows.sort((a, b) => (isLevelUp ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label))
      return { method, label: humanize(method), rows }
    })
    .filter((t) => t.rows.length)
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label))

  return { games, selected, tables }
})
