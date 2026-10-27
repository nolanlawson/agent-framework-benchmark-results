import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { MoveTables } from '../components/MoveTables'
import { Section } from '../components/Section'
import { TypeBadges } from '../components/TypeBadge'
import { dexNumber, pageTitle } from '../lib/format'
import type { EvolutionNode } from '../lib/types'
import { NotFound } from '../components/NotFound'
import { fetchPokemon } from '../server/functions'

const MAX_STAT = 255

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
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  notFoundComponent: NotFound,
  component: PokemonPage,
})

function PokemonPage() {
  const p = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const total = p.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <div className="pokemon-summary">
        <div className="artwork">
          {p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}
        </div>
        <div className="pokemon-info">
          <p className="dex">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          {p.genus && <p className="genus">{p.genus}</p>}
          <TypeBadges types={p.types} />
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
              <StatRow key={s.name} label={s.label} value={s.value} max={MAX_STAT} />
            ))}
          </tbody>
          <tfoot>
            <StatRow label="Total" value={total} max={MAX_STAT * Math.max(1, p.stats.length)} />
          </tfoot>
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
        {p.evolution && (
          <ul className="evolution">
            <EvolutionItem node={p.evolution} />
          </ul>
        )}
      </Section>

      <Section id="moves" title="Moves">
        {p.games.length === 0 ? (
          <p>This Pokémon learns no moves.</p>
        ) : (
          <>
            <div className="field field-inline">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={p.game ?? ''}
                onChange={(e) =>
                  navigate({ search: { game: e.target.value }, replace: true, resetScroll: false })
                }
              >
                {p.games.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <MoveTables key={p.game} tables={p.moveTables} />
          </>
        )}
      </Section>
    </>
  )
}

function StatRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
      <td className="stat-bar-cell" aria-hidden="true">
        <span className="stat-bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      </td>
    </tr>
  )
}

function EvolutionItem({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.label}
      </Link>
      {node.evolvesTo.length > 0 && (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionItem key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}
