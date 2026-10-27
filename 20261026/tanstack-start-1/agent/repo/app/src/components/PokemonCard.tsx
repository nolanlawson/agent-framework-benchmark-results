import { Link } from '@tanstack/react-router'
import { dexNumber, humanize } from '../lib/format'
import type { CardData } from '../lib/types'
import { TypeList } from './TypeBadge'

export function PokemonCard({ card }: { card: CardData }) {
  return (
    <li className="card">
      <Link to="/pokemon/$name" params={{ name: card.name }} className="card-link">
        <img src={card.sprite} alt="" width={96} height={96} loading="lazy" className="card-sprite" />
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{humanize(card.name)}</span>
      </Link>
      {card.types && card.types.length > 0 && <TypeList types={card.types} link={false} />}
      {card.hidden && <span className="card-note">Hidden ability</span>}
    </li>
  )
}

export function CardGrid({ cards }: { cards: CardData[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} />
      ))}
    </ul>
  )
}
