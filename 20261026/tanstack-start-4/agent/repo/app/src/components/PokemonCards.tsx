import { Link } from '@tanstack/react-router'
import { dexNumber } from '../lib/format'
import type { CardData } from '../lib/types'
import { TypeBadges } from './TypeBadge'

export function PokemonCard({ pokemon }: { pokemon: CardData }) {
  return (
    <Link to="/pokemon/$name" params={{ name: pokemon.name }} className="card">
      <img className="card-sprite" src={pokemon.sprite} alt="" width={96} height={96} loading="lazy" decoding="async" />
      <span className="card-dex">{dexNumber(pokemon.id)}</span>
      <span className="card-name">{pokemon.label}</span>
      {pokemon.types && <TypeBadges types={pokemon.types} plain />}
      {pokemon.hidden && <span className="card-note">Hidden ability</span>}
    </Link>
  )
}

export function PokemonCards({ pokemon }: { pokemon: CardData[] }) {
  return (
    <ul className="card-grid">
      {pokemon.map((p) => (
        <li key={p.id}>
          <PokemonCard pokemon={p} />
        </li>
      ))}
    </ul>
  )
}
