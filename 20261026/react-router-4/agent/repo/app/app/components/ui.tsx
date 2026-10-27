import { useId } from "react";
import { Link } from "react-router";
import type { Card } from "~/lib/api.server";
import { dexNumber, humanize } from "~/lib/format";

export function TypeBadge({ name, label, link = true }: { name: string; label: string; link?: boolean }) {
  const style = { "--type-color": `var(--type-${name}, var(--color-text-muted))` } as React.CSSProperties;
  return link ? (
    <Link to={`/types/${name}`} className="type-badge" style={style}>
      {label}
    </Link>
  ) : (
    <span className="type-badge" style={style}>
      {label}
    </span>
  );
}

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
  const headingId = `${useId()}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={`panel ${className ?? ""}`.trim()}>
      <h2 id={headingId} className="panel__title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PokemonCard({ card }: { card: Card }) {
  const label = humanize(card.name);
  return (
    <Link to={`/pokemon/${card.name}`} className="card">
      <img className="card__sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
      <span className="card__dex">{dexNumber(card.id)}</span>
      <span className="card__name">{label}</span>
      {card.types && (
        <span className="card__types">
          {card.types.map((t) => (
            <TypeBadge key={t.name} name={t.name} label={t.label} link={false} />
          ))}
        </span>
      )}
      {card.hidden && <span className="card__note">Hidden ability</span>}
    </Link>
  );
}

export function CardList({ cards }: { cards: Card[] }) {
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

export function Count({ n, noun = "Pokémon" }: { n: number; noun?: string }) {
  return (
    <p className="count">
      {n} {noun}
    </p>
  );
}
