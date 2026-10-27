import { API_BASE_URL, type CardData } from '@/lib/api';
import { CardGrid, PokemonCard } from './PokemonCard';

export function PokemonCards({ cards }: { cards: CardData[] }) {
  return (
    <CardGrid>
      {cards.map((card) => (
        <li key={card.id}>
          <PokemonCard id={card.id} name={card.name} spriteBase={API_BASE_URL} hidden={card.hidden} />
        </li>
      ))}
    </CardGrid>
  );
}
