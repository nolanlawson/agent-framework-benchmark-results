import { Section, TypeBadge } from '../components.js'
import { must } from '../api.js'
import {
  englishName,
  flavorText,
  getSpecies,
  typeNames,
  type ChainLink,
  type EvolutionChainData,
  type PokemonData,
  type SpeciesData,
} from '../data.js'
import { COLUMN_LABELS, COLUMNS, gamesFor, moveTables, sortRows, type MoveTable, type Sort } from '../moves.js'
import { dexNumber, english, humanize, orDash, withQuery } from '../util.js'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}
const MAX_STAT = 255

export type PokemonPageData = { species: SpeciesData; pokemon: PokemonData; title: string }

export async function loadPokemon(name: string): Promise<PokemonPageData | null> {
  const species = await getSpecies(name)
  if (!species) return null
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0]
  const pokemon = await must<PokemonData>(variety ? variety.pokemon.url : `pokemon/${species.id}`)
  return { species, pokemon, title: englishName(species) }
}

/** Resolves the selected game: the requested one if valid, else the latest. */
export async function resolveGame(pokemon: PokemonData, requested: string | undefined) {
  const games = await gamesFor(pokemon)
  const game = games.find((g) => g.name === requested)?.name ?? games.at(-1)?.name
  return { games, game }
}

const StatBar = ({ value, max }: { value: number; max: number }) => (
  <div class="stat-bar" aria-hidden="true">
    <div class="stat-bar__fill" style={`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`} />
  </div>
)

const Evolution = ({ link }: { link: ChainLink }) => (
  <li>
    <a href={`/pokemon/${link.species.name}`}>{humanize(link.species.name)}</a>
    {link.evolves_to.length > 0 && (
      <ul>
        {link.evolves_to.map((l) => (
          <Evolution link={l} />
        ))}
      </ul>
    )}
  </li>
)

export function MoveTableView({ table, species, game, sort }: { table: MoveTable; species: string; game: string; sort: Sort }) {
  const columns = COLUMNS.filter((c) => c !== 'level' || table.method === 'level-up')
  const rows = sortRows(table.rows, table.method, sort)
  return (
    <div class="table-scroll" id={`moves-${table.method}`}>
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const current = sort?.column === column ? sort.dir : undefined
              const next = current === 'ascending' ? 'descending' : 'ascending'
              const url = withQuery(`/pokemon/${species}/moves/table`, {
                game,
                method: table.method,
                sort: column,
                dir: next,
              })
              return (
                <th scope="col" aria-sort={current}>
                  <button
                    type="button"
                    id={`sort-${table.method}-${column}`}
                    hx-get={url}
                    hx-target={`#moves-${table.method}`}
                    hx-swap="outerHTML"
                  >
                    {COLUMN_LABELS[column]}
                    <span class="sort-indicator" aria-hidden="true">
                      {current === 'ascending' ? '▲' : current === 'descending' ? '▼' : ''}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr>
              {table.method === 'level-up' && <td>{row.level}</td>}
              <td>
                <a href={`/moves/${row.name}`}>{row.label}</a>
              </td>
              <td>
                <TypeBadge name={row.type} label={row.typeLabel} />
              </td>
              <td>{orDash(row.category)}</td>
              <td>{orDash(row.power)}</td>
              <td>{orDash(row.accuracy)}</td>
              <td>{orDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export async function MoveTables({ pokemon, species, game }: { pokemon: PokemonData; species: string; game: string | undefined }) {
  if (!game) return <p>No moves.</p>
  const tables = await moveTables(pokemon, game)
  if (!tables.length) return <p>No moves.</p>
  return (
    <>
      {tables.map((table) => (
        <MoveTableView table={table} species={species} game={game} sort={undefined} />
      ))}
    </>
  )
}

export async function PokemonPage({ data, requestedGame }: { data: PokemonPageData; requestedGame: string | undefined }) {
  const { species, pokemon, title } = data
  const [types, chain, { games, game }] = await Promise.all([
    typeNames(),
    species.evolution_chain ? must<EvolutionChainData>(species.evolution_chain.url) : null,
    resolveGame(pokemon, requestedGame),
  ])
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default
  const genus = english(species.genera)?.genus
  const flavor = flavorText(species)
  const stats = pokemon.stats.map((s) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat }))
  const total = stats.reduce((sum, s) => sum + s.value, 0)
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot)
  const speciesName = species.name

  return (
    <>
      <div class="hero">
        <div class="hero__art">{artwork && <img src={artwork} alt={title} width="256" height="256" />}</div>
        <div class="hero__info">
          <p class="hero__dex">{dexNumber(species.id)}</p>
          <h1>{title}</h1>
          {genus && <p class="hero__genus">{genus}</p>}
          <p class="badges">
            {[...pokemon.types]
              .sort((a, b) => a.slot - b.slot)
              .map((t) => (
                <TypeBadge name={t.type.name} label={types.get(t.type.name) ?? humanize(t.type.name)} />
              ))}
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavor && <p class="hero__flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {stats.map((s) => (
              <tr>
                <th scope="row">{s.label}</th>
                <td class="stats-table__value">{s.value}</td>
                <td class="stats-table__bar">
                  <StatBar value={s.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr class="stats-table__total">
              <th scope="row">Total</th>
              <td class="stats-table__value">{total}</td>
              <td class="stats-table__bar">
                <StatBar value={total} max={MAX_STAT * stats.length} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-list">
          {abilities.map((a) => (
            <li>
              <a href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</a>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul class="plain-list">
          {chain ? (
            <Evolution link={chain.chain} />
          ) : (
            <li>
              <a href={`/pokemon/${speciesName}`}>{humanize(speciesName)}</a>
            </li>
          )}
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {games.length > 0 && (
          <div class="game-picker">
            <label for="game">Game</label>
            <select
              id="game"
              name="game"
              hx-get={`/pokemon/${speciesName}/moves`}
              hx-target="#moves-body"
              hx-trigger="change"
              hx-sync="this:replace"
            >
              {games.map((g) => (
                <option value={g.name} selected={g.name === game}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div id="moves-body">
          <MoveTables pokemon={pokemon} species={speciesName} game={game} />
        </div>
      </Section>
    </>
  )
}

