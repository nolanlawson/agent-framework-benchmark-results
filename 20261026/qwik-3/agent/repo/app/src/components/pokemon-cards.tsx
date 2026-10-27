import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { CardData } from "~/lib/api";
import { dexNumber, humanize } from "~/lib/format";
import { TypeBadge } from "./type-badge";

export const PokemonCard = component$<{ card: CardData }>(({ card }) => {
  const label = humanize(card.name);
  return (
    <Link href={`/pokemon/${card.name}`} class="card">
      <img src={card.sprite} alt="" width={96} height={96} loading="lazy" class="card__sprite" />
      <span class="card__dex">{dexNumber(card.id)}</span>
      <span class="card__name">{label}</span>
      {card.types && card.types.length > 0 && (
        <span class="card__types">
          {card.types.map((t) => (
            <TypeBadge key={t.name} name={t.name} label={t.label} />
          ))}
        </span>
      )}
      {card.hidden && <span class="card__note">Hidden ability</span>}
    </Link>
  );
});

export const PokemonCards = component$<{ cards: CardData[] }>(({ cards }) => (
  <ul class="card-grid">
    {cards.map((card) => (
      <li key={card.id}>
        <PokemonCard card={card} />
      </li>
    ))}
  </ul>
));
