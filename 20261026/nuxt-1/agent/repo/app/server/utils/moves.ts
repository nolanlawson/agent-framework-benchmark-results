import type { MoveRow } from '#shared/types'
import type { Index } from './pokeapi'

export function summarizeMove(move: any, index: Index): Omit<MoveRow, 'level'> {
  return {
    name: move.name,
    label: englishName(move.names, move.name),
    type: move.type ? typeRef(index, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
  }
}

/** Compact move summary, cached separately from the (large) raw move record. */
export function moveSummary(name: string, index: Index) {
  return memo(`move-summary:${name}`, async () => {
    const move = await fetchApi(`move/${name}`)
    return move ? summarizeMove(move, index) : null
  })
}

/** Version group name → `order`. */
export function versionGroupOrder(): Promise<Map<string, number>> {
  return memo('version-groups', async () => {
    const list = await apiOrThrow('version-group/?limit=1000')
    const groups = await Promise.all((list.results as { name: string }[]).map((g) => api(`version-group/${g.name}`)))
    return new Map(groups.filter(Boolean).map((g) => [g.name, g.order as number]))
  })
}
