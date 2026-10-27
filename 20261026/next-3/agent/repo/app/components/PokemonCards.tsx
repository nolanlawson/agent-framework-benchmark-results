import Link from "next/link";
import type { CardData } from "@/lib/data";
import { dexNumber } from "@/lib/format";
import { TypeList } from "./TypeBadge";

export function PokemonCards({ cards }: { cards: CardData[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <Link href={`/pokemon/${card.name}`} className="card" prefetch={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="card__sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" decoding="async" />
            <span className="card__number">{dexNumber(card.id)}</span>
            <span className="card__name">{card.label}</span>
            {card.types && card.types.length > 0 && <TypeList types={card.types} link={false} />}
            {card.note && <span className="card__note">{card.note}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
