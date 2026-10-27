import Link from 'next/link';
import { dexNumber, humanize, spriteUrl } from '@/lib/format';
import { TypeBadge } from './TypeBadge';

export type CardData = {
  id: number;
  name: string;
  types?: { name: string; label: string }[];
  note?: string;
};

/** A list of Pokémon cards, ordered as given (callers sort by dex number). */
export function PokemonCardList({ cards, apiBase }: { cards: CardData[]; apiBase: string }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id} className="card">
          <Link href={`/pokemon/${card.name}`} className="card-link">
            <img src={spriteUrl(apiBase, card.id)} alt="" width={96} height={96} className="card-sprite" loading="lazy" />
            <span className="card-number">{dexNumber(card.id)}</span>
            <span className="card-name">{humanize(card.name)}</span>
            {card.types && card.types.length > 0 && (
              <span className="card-types">
                {card.types.map((t) => (
                  <TypeBadge key={t.name} name={t.name} label={t.label} small />
                ))}
              </span>
            )}
            {card.note && <span className="card-note">{card.note}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
