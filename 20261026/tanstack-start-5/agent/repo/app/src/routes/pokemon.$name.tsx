import { useState } from 'react'
import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { Section, TypeBadge } from '../components/ui'
import { dexNumber, orDash, pageTitle } from '../lib/format'
import { getPokemon } from '../lib/pokedex.functions'
import type { EvolutionNode, MoveRow, MoveTable } from '../lib/types'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}
// Bars are scaled against the highest base stat in the games.
const STAT_MAX = 255

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): { game?: string } =>
    typeof search.game === 'string' && search.game ? { game: search.game } : {},
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: async ({ params, deps }) => {
    const pokemon = await getPokemon({ data: { name: params.name, game: deps.game } })
    if (!pokemon) throw notFound()
    return pokemon
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: PokemonPage,
})

function PokemonPage() {
  const p = Route.useLoaderData()
  const total = p.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <div className="summary">
        <div className="artwork">{p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}</div>
        <div className="summary-info">
          <p className="dex">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          {p.genus && <p className="genus">{p.genus}</p>}
          <p className="badges">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} link />
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{p.height.toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight.toFixed(1)} kg</dd>
            </div>
          </dl>
          {p.flavorText && <p className="flavor">{p.flavorText}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {p.stats.map((s) => (
              <StatRow key={s.name} label={STAT_LABELS[s.name] ?? s.name} value={s.value} max={STAT_MAX} />
            ))}
            <StatRow label="Total" value={total} max={STAT_MAX * Math.max(1, p.stats.length)} total />
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>
                {a.label}
              </Link>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul className="evolution">
          <EvolutionItem node={p.evolution} current={p.name} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        <Moves games={p.games} game={p.game} tables={p.moveTables} />
      </Section>
    </>
  )
}

function StatRow({ label, value, max, total }: { label: string; value: number; max: number; total?: boolean }) {
  return (
    <tr className={total ? 'stat-total' : undefined}>
      <th scope="row">{label}</th>
      <td className="stat-value">{value}</td>
      <td className="stat-bar" aria-hidden="true">
        <span className="bar-track">
          <span className="bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        </span>
      </td>
    </tr>
  )
}

function EvolutionItem({ node, current }: { node: EvolutionNode; current: string }) {
  return (
    <li>
      <Link
        to="/pokemon/$name"
        params={{ name: node.name }}
        aria-current={node.name === current ? 'page' : undefined}
      >
        {node.label}
      </Link>
      {node.evolvesTo.length > 0 && (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionItem key={child.name} node={child} current={current} />
          ))}
        </ul>
      )}
    </li>
  )
}

function Moves({ games, game, tables }: { games: { name: string; label: string }[]; game: string | null; tables: MoveTable[] }) {
  const navigate = useNavigate({ from: '/pokemon/$name' })
  if (!games.length) return <p>{'—'}</p>
  return (
    <>
      <div className="field field-inline">
        <label htmlFor="game">Game</label>
        <select
          id="game"
          value={game ?? ''}
          onChange={(e) =>
            navigate({
              search: { game: e.target.value },
              hash: (h) => h ?? '',
              replace: true,
              resetScroll: false,
              hashScrollIntoView: false,
            })
          }
        >
          {games.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((t) => (
        <SortableMoveTable key={`${game}:${t.method}`} table={t} />
      ))}
    </>
  )
}

type Column = { key: keyof MoveRow | 'type'; label: string; numeric?: boolean }

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level', numeric: true },
  { key: 'label', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
]

function sortValue(row: MoveRow, key: Column['key']): string | number | null {
  if (key === 'type') return row.type.label
  return row[key] as string | number | null
}

function SortableMoveTable({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<{ key: Column['key']; dir: 'ascending' | 'descending' } | null>(null)
  const columns = COLUMNS.filter((c) => c.key !== 'level' || table.method === 'level-up')
  const captionId = `moves-${table.method}`

  let rows = table.rows
  if (sort) {
    const factor = sort.dir === 'ascending' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      // Missing values go last whichever way the column is sorted.
      if (va === null && vb === null) return a.label.localeCompare(b.label)
      if (va === null) return 1
      if (vb === null) return -1
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return cmp * factor || a.label.localeCompare(b.label)
    })
  }

  const toggle = (key: Column['key']) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'ascending' ? 'descending' : 'ascending' } : { key, dir: 'ascending' }))

  return (
    <div className="table-wrap">
      <table className="moves">
        <caption id={captionId}>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? sort.dir : undefined}>
                <button type="button" className="sort" onClick={() => toggle(c.key)}>
                  {c.label}
                  <span className="sort-icon" aria-hidden="true">
                    {sort?.key === c.key ? (sort.dir === 'ascending' ? ' ▲' : ' ▼') : ''}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.name}:${r.level}`}>
              {table.method === 'level-up' && <td>{r.level}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: r.name }}>
                  {r.label}
                </Link>
              </td>
              <td>
                <TypeBadge type={r.type} link />
              </td>
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
