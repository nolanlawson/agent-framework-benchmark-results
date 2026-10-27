import { createAsync } from "@solidjs/router";
import { For, type JSX, Show } from "solid-js";
import { HttpStatusCode } from "@solidjs/start";
import { Title } from "@solidjs/meta";
import { dexNumber, humanize, pageTitle } from "~/lib/format";
import { getMediaBase } from "~/lib/queries";
import type { Card, Named } from "~/lib/types";

export function PageTitle(props: { heading?: string }) {
  return <Title>{pageTitle(props.heading)}</Title>;
}

export function TypeBadge(props: { type: Named; link?: boolean }) {
  const style = () => ({ "--badge-bg": `var(--type-${props.type.name}, var(--color-text-muted))` });
  return (
    <Show when={props.link !== false} fallback={<span class="badge" style={style()}>{props.type.label}</span>}>
      <a class="badge" style={style()} href={`/types/${props.type.name}`}>
        {props.type.label}
      </a>
    </Show>
  );
}

export function Section(props: { id: string; title: string; class?: string; children: JSX.Element }) {
  return (
    <section class={`panel ${props.class ?? ""}`} id={props.id} aria-labelledby={`${props.id}-heading`}>
      <h2 id={`${props.id}-heading`}>{props.title}</h2>
      {props.children}
    </section>
  );
}

export function Count(props: { n: number; noun?: string }) {
  return (
    <p class="count">
      {props.n} {props.noun ?? "Pokémon"}
    </p>
  );
}

export function CardList(props: { cards: Card[]; typeLabels?: Map<string, string> }) {
  const media = createAsync(() => getMediaBase(), { deferStream: true });
  return (
    <ul class="cards">
      <For each={props.cards}>
        {(card) => (
          <li class="card">
            <a href={`/pokemon/${card.name}`}>
              <img
                class="sprite"
                src={`${media() ?? ""}/media/sprites/pokemon/${card.id}.png`}
                alt=""
                width="96"
                height="96"
                loading="lazy"
              />
              <span class="dex">{dexNumber(card.id)}</span>
              <span class="card-name">{humanize(card.name)}</span>
            </a>
            <Show when={card.types?.length}>
              <span class="card-types">
                <For each={card.types}>
                  {(t) => <TypeBadge type={{ name: t, label: props.typeLabels?.get(t) ?? humanize(t) }} link={false} />}
                </For>
              </span>
            </Show>
            <Show when={card.hidden}>
              <span class="card-note">Hidden ability</span>
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

export function NotFound() {
  return (
    <>
      <PageTitle heading="Not found" />
      <HttpStatusCode code={404} />
      <h1>Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>
  );
}
