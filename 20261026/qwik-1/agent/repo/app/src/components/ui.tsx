import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { CardData, TypeRef } from "~/lib/format";

export const TypeBadge = component$<{ type: TypeRef; link?: boolean }>(({ type, link }) =>
  link ? (
    <Link href={`/types/${type.name}`} class={`badge type-${type.name}`}>
      {type.label}
    </Link>
  ) : (
    <span class={`badge type-${type.name}`}>{type.label}</span>
  ),
);

export const PokemonCard = component$<{ card: CardData }>(({ card }) => (
  <li class="card">
    <Link href={`/pokemon/${card.name}`} class="card-link">
      <img src={card.sprite} alt="" width={96} height={96} loading="lazy" class="sprite" />
      <span class="dex">{card.dex}</span>
      <span class="card-name">{card.label}</span>
    </Link>
    {card.types && card.types.length > 0 && (
      <span class="badges">
        {card.types.map((t) => (
          <TypeBadge key={t.name} type={t} />
        ))}
      </span>
    )}
    {card.hidden && <span class="card-note">Hidden ability</span>}
  </li>
));

export const CardList = component$<{ cards: CardData[] }>(({ cards }) => (
  <ul class="card-grid">
    {cards.map((c) => (
      <PokemonCard key={c.id} card={c} />
    ))}
  </ul>
));

export const Section = component$<{ id: string; title: string; class?: string }>((props) => (
  <section id={props.id} aria-labelledby={`${props.id}-heading`} class={["panel", props.class]}>
    <h2 id={`${props.id}-heading`}>{props.title}</h2>
    <Slot />
  </section>
));

export const NotFound = component$(() => (
  <>
    <h1>Not found</h1>
    <p>
      <Link href="/">Back to the Pokédex</Link>
    </p>
  </>
));
