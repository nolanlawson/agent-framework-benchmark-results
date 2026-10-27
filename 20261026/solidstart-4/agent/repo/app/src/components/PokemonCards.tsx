import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { dexNumber } from "~/lib/format";
import type { Card } from "~/lib/types";
import TypeBadge from "./TypeBadge";

export function PokemonCard(props: { card: Card }) {
  return (
    <A href={`/pokemon/${props.card.name}`} class="card">
      <img class="card-sprite" src={props.card.sprite} alt="" width="96" height="96" loading="lazy" />
      <span class="card-number">{dexNumber(props.card.id)}</span>
      <span class="card-name">{props.card.label}</span>
      <Show when={props.card.types?.length}>
        <span class="type-list">
          <For each={props.card.types}>{(type) => <TypeBadge type={type} plain />}</For>
        </span>
      </Show>
      <Show when={props.card.hidden}>
        <span class="card-note">Hidden ability</span>
      </Show>
    </A>
  );
}

export default function PokemonCards(props: { cards: Card[] }) {
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
