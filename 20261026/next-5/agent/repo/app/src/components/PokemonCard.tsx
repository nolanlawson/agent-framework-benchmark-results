import Link from 'next/link';
import { dexNumber, humanize } from '@/lib/format';
import { TypeBadges } from './TypeBadge';

export type CardData = {
  id: number;
  name: string;
  types?: { name: string; label: string }[];
  note?: string;
};

export function spriteUrl(apiBase: string, id: number) {
  return `${apiBase}/media/sprites/pokemon/${id}.png`;
}

export function PokemonCard({ card, apiBase }: { card: CardData; apiBase: string }) {
  return (
    <li className="card">
      <Link href={`/pokemon/${card.name}`} className="card-link" prefetch={false}>
        <img className="sprite" src={spriteUrl(apiBase, card.id)} alt="" width={96} height={96} loading="lazy" decoding="async" />
        <span className="dex">{dexNumber(card.id)}</span>
        <span className="card-name">{humanize(card.name)}</span>
      </Link>
      {card.types && <TypeBadges types={card.types} />}
      {card.note && <span className="card-note">{card.note}</span>}
    </li>
  );
}

export function PokemonCardList({ cards, apiBase }: { cards: CardData[]; apiBase: string }) {
  return (
    <ul className="cards">
      {cards.map((c) => (
        <PokemonCard key={c.id} card={c} apiBase={apiBase} />
      ))}
    </ul>
  );
}
