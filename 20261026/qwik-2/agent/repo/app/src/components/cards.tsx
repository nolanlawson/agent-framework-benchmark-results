import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Card } from "~/lib/types";
import { dexNumber } from "~/lib/format";
import { TypeBadge } from "./type-badge";

export const PokemonCard = component$<{ card: Card }>(({ card }) => (
  <Link class="card" href={`/pokemon/${card.name}`}>
    <img class="card-sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
    <span class="card-dex">{dexNumber(card.id)}</span>
    <span class="card-name">{card.label}</span>
    {card.types && (
      <span class="card-types">
        {card.types.map((t) => (
          <TypeBadge key={t.name} type={t} />
        ))}
      </span>
    )}
    {card.hidden && <span class="card-note">Hidden ability</span>}
  </Link>
));

export const CardList = component$<{ cards: Card[] }>(({ cards }) => (
  <ul class="card-grid">
    {cards.map((card) => (
      <li key={card.id}>
        <PokemonCard card={card} />
      </li>
    ))}
  </ul>
));
