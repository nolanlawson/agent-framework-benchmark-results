const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function compareMethods(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a)
  const ib = METHOD_ORDER.indexOf(b)
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  return humanize(a).localeCompare(humanize(b))
}

export default defineEventHandler(async (event) => {
  const { pokemon } = await getSpeciesAndPokemon(getRouterParam(event, 'name') ?? '')
  const versionGroups = await getVersionGroups(pokemon)
  const requested = getQuery(event).game
  const game = versionGroups.some((g) => g.name === requested)
    ? (requested as string)
    : (versionGroups[versionGroups.length - 1]?.name ?? null)

  type Learned = { move: string; method: string; level: number }
  const learned: Learned[] = []
  for (const { move, version_group_details } of pokemon.moves) {
    for (const d of version_group_details) {
      if (d.version_group.name !== game) continue
      learned.push({ move: move.name, method: d.move_learn_method.name, level: d.level_learned_at })
    }
  }

  const labels = await getTypeLabels()
  const moveNames = [...new Set(learned.map((l) => l.move))]
  const details = new Map(
    await mapLimit(moveNames, 16, async (name) => [name, await api(`move/${name}`)] as const),
  )

  const tables = new Map<string, MoveRow[]>()
  for (const { move, method, level } of learned) {
    const detail = details.get(move)
    const rows = tables.get(method) ?? []
    rows.push({
      level: method === 'level-up' ? level : null,
      name: move,
      label: englishName(detail.names, move),
      type: typeRef(detail.type.name, labels),
      category: detail.damage_class ? humanize(detail.damage_class.name) : null,
      power: detail.power,
      accuracy: detail.accuracy,
      pp: detail.pp,
    })
    tables.set(method, rows)
  }

  const result: MoveTable[] = [...tables]
    .sort(([a], [b]) => compareMethods(a, b))
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))

  return { game, tables: result }
})
