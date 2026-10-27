import { useId } from "react";
import { Link } from "react-router";
import type { CardData, TypeInfo } from "~/lib/api.server";
import { dexNumber, humanize } from "~/lib/format";

export function TypeBadge({ type, as = "link" }: { type: TypeInfo; as?: "link" | "span" }) {
  const className = `type-badge type-${type.name}`;
  if (as === "span") return <span className={className}>{type.label}</span>;
  return (
    <Link to={`/types/${type.name}`} className={className}>
      {type.label}
    </Link>
  );
}

export function TypeLinks({ types }: { types: TypeInfo[] }) {
  return (
    <ul className="type-list">
      {types.map((type) => (
        <li key={type.name}>
          <TypeBadge type={type} />
        </li>
      ))}
    </ul>
  );
}

/** A `region` landmark labelled by its heading. */
export function Section({
  title,
  id,
  className,
  children,
}: {
  title: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={`panel${className ? ` ${className}` : ""}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}

export function Count({ n, noun = "Pokémon" }: { n: number; noun?: string }) {
  return (
    <p className="count">
      {n} {noun}
    </p>
  );
}

export function PokemonCard({ card }: { card: CardData }) {
  const label = humanize(card.name);
  return (
    <Link to={`/pokemon/${card.name}`} className="card">
      <img
        className="card__sprite"
        src={card.sprite}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
      />
      <span className="card__dex">{dexNumber(card.id)}</span>
      <span className="card__name">{label}</span>
      {card.types && card.types.length > 0 && (
        <span className="card__types">
          {card.types.map((type) => (
            <TypeBadge key={type.name} type={type} as="span" />
          ))}
        </span>
      )}
      {card.hidden && <span className="card__note">Hidden ability</span>}
    </Link>
  );
}

export function CardList({ cards }: { cards: CardData[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <PokemonCard card={card} />
        </li>
      ))}
    </ul>
  );
}
