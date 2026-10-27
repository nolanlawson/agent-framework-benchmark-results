import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { dexNumber, humanize, type CardData } from "~/lib/format";
import { TypeBadge } from "./type-badge";

export const PokemonCard = component$<{ card: CardData }>(({ card }) => (
  <Link class="card" href={`/pokemon/${card.name}`}>
    <img class="card-sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
    <span class="card-dex">{dexNumber(card.id)}</span>
    <span class="card-name">{humanize(card.name)}</span>
    {card.types && card.types.length > 0 && (
      <span class="badges card-types">
        {card.types.map((t) => (
          <TypeBadge key={t.name} type={t} plain />
        ))}
      </span>
    )}
    {card.hidden && <span class="card-note">Hidden ability</span>}
  </Link>
));

export const CardList = component$<{ cards: CardData[] }>(({ cards }) => (
  <ul class="card-grid" role="list">
    {cards.map((card) => (
      <li key={card.id}>
        <PokemonCard card={card} />
      </li>
    ))}
  </ul>
));
