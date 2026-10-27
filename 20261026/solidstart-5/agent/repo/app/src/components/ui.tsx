import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { For, Show, type JSX, type ParentProps } from "solid-js";
import { dexNumber, pageTitle } from "~/lib/format";
import type { Card, TypeRef } from "~/lib/types";

export function PageTitle(props: { heading?: string }) {
  return <Title>{pageTitle(props.heading)}</Title>;
}

/** A `region` landmark named by its heading. */
export function Section(props: ParentProps<{ id: string; title: string; class?: string }>) {
  return (
    <section id={props.id} class={`panel ${props.class ?? ""}`} aria-labelledby={`${props.id}-heading`}>
      <h2 id={`${props.id}-heading`} class="panel__title">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

export function TypeBadge(props: { type: TypeRef; link?: boolean }) {
  const cls = () => `type-badge type-badge--${props.type.name}`;
  return (
    <Show when={props.link} fallback={<span class={cls()}>{props.type.label}</span>}>
      <a class={cls()} href={`/types/${props.type.name}`}>
        {props.type.label}
      </a>
    </Show>
  );
}

export function TypeBadges(props: { types: TypeRef[]; link?: boolean }) {
  return (
    <ul class="type-badges">
      <For each={props.types}>
        {(type) => (
          <li>
            <TypeBadge type={type} link={props.link} />
          </li>
        )}
      </For>
    </ul>
  );
}

export function PokemonCard(props: { card: Card }) {
  return (
    <a class="card" href={`/pokemon/${props.card.name}`}>
      <img class="card__sprite" src={props.card.sprite} alt="" width="96" height="96" loading="lazy" decoding="async" />
      <span class="card__dex">{dexNumber(props.card.id)}</span>
      <span class="card__name">{props.card.label}</span>
      <Show when={props.card.types?.length}>
        <span class="card__types">
          <For each={props.card.types}>{(type) => <TypeBadge type={type} />}</For>
        </span>
      </Show>
      <Show when={props.card.hidden}>
        <span class="card__note">Hidden ability</span>
      </Show>
    </a>
  );
}

export function CardGrid(props: { cards: Card[] }) {
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

export function Count(props: { n: number; noun?: string }) {
  return (
    <p class="count">
      {props.n} {props.noun ?? "Pokémon"}
    </p>
  );
}

/** A description list rendered as a row of label/value pairs. */
export function Facts(props: { items: [term: string, value: JSX.Element][]; class?: string }) {
  return (
    <dl class={`facts ${props.class ?? ""}`}>
      <For each={props.items}>
        {([term, value]) => (
          <div class="facts__item">
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        )}
      </For>
    </dl>
  );
}

export function NotFound() {
  return (
    <>
      <PageTitle heading="Not found" />
      <HttpStatusCode code={404} />
      <h1 class="page-title">Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>
  );
}
