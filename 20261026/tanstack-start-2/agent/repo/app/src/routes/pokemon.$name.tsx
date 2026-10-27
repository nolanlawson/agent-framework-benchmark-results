import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { MoveTables } from '../components/MoveTables'
import { Section } from '../components/Section'
import { TypeLink } from '../components/TypeBadge'
import { dexNumber, pageTitle } from '../lib/format'
import { fetchPokemon } from '../lib/api'
import type { EvolutionNode } from '../lib/types'

const STAT_MAX = 255

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): { game?: string } => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: ({ params, deps }) => fetchPokemon({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: PokemonPage,
})

function Evolution({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.label}
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
  const p = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pokemon/$name' })
  const total = p.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <div className="summary">
        <div className="artwork">
          {p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}
        </div>
        <div className="summary-info">
          <p className="dex">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          {p.genus && <p className="muted genus">{p.genus}</p>}
          <p className="badges">
            {p.types.map((t) => (
              <TypeLink key={t.name} type={t} />
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{p.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight}</dd>
            </div>
          </dl>
          {p.flavorText && <p className="flavor">{p.flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.label}>
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
                  <span style={{ width: `${Math.min(100, (total / (STAT_MAX * 6)) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
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

      <Section title="Evolution">
        <ul className="plain-list evolution">
          <Evolution node={p.evolution} />
        </ul>
      </Section>

      <Section title="Moves" id="moves">
        {p.games.length > 0 ? (
          <>
            <div className="field field-inline">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={p.game ?? ''}
                onChange={(e) =>
                  navigate({ search: { game: e.target.value }, hash: 'moves', replace: true, resetScroll: false })
                }
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <MoveTables key={p.game} tables={p.moveTables} />
          </>
        ) : (
          <p>—</p>
        )}
      </Section>
    </>
  )
}
