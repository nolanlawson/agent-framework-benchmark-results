import { Link } from "react-router";
import { dexNumber, humanize } from "../lib/format";
import type { Card } from "../lib/pokeapi.server";
import { TypeBadge } from "./TypeBadge";

export function PokemonCard({ card }: { card: Card }) {
  return (
    <Link to={`/pokemon/${card.name}`} className="card">
      <img className="card__sprite" src={card.sprite} alt="" width={96} height={96} />
      <span className="card__number">{dexNumber(card.id)}</span>
      <span className="card__name">{humanize(card.name)}</span>
      {card.types && card.types.length > 0 && (
        <span className="card__types">
          {card.types.map((t) => (
            <TypeBadge key={t.name} type={t} />
          ))}
        </span>
      )}
      {card.hidden && <span className="card__note">Hidden ability</span>}
    </Link>
  );
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
  );
}
