import { For, Show } from "solid-js";
import { dexNumber } from "~/lib/format";
import type { Card } from "~/lib/types";
import { TypeBadges } from "./TypeBadge";

export function PokemonCard(props: { card: Card }) {
  return (
    <a class="card" href={`/pokemon/${props.card.name}`}>
      <img
        class="card__sprite"
        src={props.card.sprite}
        alt=""
        width="96"
        height="96"
        loading="lazy"
        decoding="async"
      />
      <span class="card__number">{dexNumber(props.card.id)}</span>
      <span class="card__name">{props.card.label}</span>
      <Show when={props.card.types?.length}>
        <TypeBadges types={props.card.types!} link={false} />
      </Show>
      <Show when={props.card.hidden}>
        <span class="card__note">Hidden ability</span>
      </Show>
    </a>
  );
}

export function CardList(props: { cards: Card[] }) {
  return (
    <ul class="card-grid">
      <For each={props.cards}>
        {(card) => (
          <li>
            <PokemonCard card={card} />
          </li>
        )}
      </For>
    </ul>
  );
}
