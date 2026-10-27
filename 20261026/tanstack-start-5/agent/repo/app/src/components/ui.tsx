import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { dexNumber } from '../lib/format'
import type { Card, NamedType } from '../lib/types'

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="panel" id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  )
}

export function TypeBadge({ type, link = false }: { type: NamedType; link?: boolean }) {
  const style = { background: `var(--type-${type.name}, var(--color-text-muted))` }
  if (link) {
    return (
      <Link to="/types/$name" params={{ name: type.name }} className="badge" style={style}>
        {type.label}
      </Link>
    )
  }
  return (
    <span className="badge" style={style}>
      {type.label}
    </span>
  )
}

export function PokemonCard({ card }: { card: Card }) {
  return (
    <Link to="/pokemon/$name" params={{ name: card.name }} className="card">
      <img src={card.sprite} alt="" width={96} height={96} loading="lazy" className="card-sprite" />
      <span className="card-dex">{dexNumber(card.id)}</span>
      <span className="card-name">{card.label}</span>
      {card.types && card.types.length > 0 && (
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

export function CardList({ cards }: { cards: Card[] }) {
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

export function Count({ n, noun = 'Pokémon' }: { n: number; noun?: string }) {
  return (
    <p className="count">
      {n} {noun}
    </p>
  )
}

export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
