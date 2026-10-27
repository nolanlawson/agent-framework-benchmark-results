import { Link } from '@tanstack/react-router'
import { dexNumber } from '../lib/format'
import type { Card } from '../lib/types'
import { TypeBadge } from './TypeBadge'

export function PokemonCard({ card }: { card: Card }) {
  return (
    <Link className="card" to="/pokemon/$name" params={{ name: card.name }}>
      <img className="card-sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
      <span className="card-dex">{dexNumber(card.id)}</span>
      <span className="card-name">{card.label}</span>
      {card.types && (
        <span className="badges">
          {card.types.map((t) => (
            <TypeBadge key={t.name} type={t} />
          ))}
        </span>
      )}
      {card.hidden && <span className="card-note">Hidden ability</span>}
    </Link>
  )
}

export function PokemonCards({ cards }: { cards: Card[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <PokemonCard card={card} />
        </li>
      ))}
    </ul>
  )
}
