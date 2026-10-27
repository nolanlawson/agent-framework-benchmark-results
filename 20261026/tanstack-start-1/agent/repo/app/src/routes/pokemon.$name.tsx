import { useId } from 'react'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { fetchPokemon } from '../server/functions'
import { dexNumber, humanize, pageTitle } from '../lib/format'
import { titleHead } from '../lib/notFound'
import type { EvolutionNode } from '../lib/types'
import { NotFound } from '../components/NotFound'
import { Section } from '../components/Section'
import { TypeList } from '../components/TypeBadge'
import { MoveTableView } from '../components/MoveTable'

// Bars are scaled against the highest possible base stat.
const STAT_MAX = 255

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): { game?: string } => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: async ({ params, deps }) => {
    const data = await fetchPokemon({ data: { name: params.name, game: deps.game } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => titleHead(loaderData ? pageTitle(loaderData.label) : undefined),
  component: PokemonPage,
  notFoundComponent: NotFound,
})

function Evolution({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {humanize(node.name)}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <Evolution key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pokemon/$name' })
  const gameId = useId()
  const total = data.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <div className="summary">
        <div className="artwork">
          {data.artwork && <img src={data.artwork} alt={data.label} width={475} height={475} />}
        </div>
        <div className="summary-body">
          <p className="dex">{dexNumber(data.id)}</p>
          <h1>{data.label}</h1>
          {data.genus && <p className="genus">{data.genus}</p>}
          <TypeList types={data.types} />
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{data.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight} kg</dd>
            </div>
          </dl>
          {data.flavor && <p className="flavor">{data.flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {data.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td>{s.value}</td>
                <td className="stat-bar-cell" aria-hidden="true">
                  <span className="stat-bar">
                    <span style={{ width: `${Math.min(100, (s.value / STAT_MAX) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stats-total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td className="stat-bar-cell" aria-hidden="true">
                <span className="stat-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (total / (STAT_MAX * Math.max(1, data.stats.length))) * 100)}%`,
                    }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="bullets">
          {data.abilities.map((a) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>
                {humanize(a.name)}
              </Link>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul className="bullets evolution">
          <Evolution node={data.evolution} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {data.games.length === 0 ? (
          <p>This Pokémon learns no moves.</p>
        ) : (
          <>
            <div className="game-field">
              <label htmlFor={gameId}>Game</label>
              <select
                id={gameId}
                value={data.selectedGame ?? ''}
                onChange={(e) =>
                  navigate({
                    search: { game: e.target.value },
                    hash: 'moves',
                    replace: true,
                    resetScroll: false,
                  })
                }
              >
                {data.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {data.moveTables.map((table) => (
              <MoveTableView key={`${data.selectedGame}:${table.method}`} table={table} />
            ))}
          </>
        )}
      </Section>
    </>
  )
}
