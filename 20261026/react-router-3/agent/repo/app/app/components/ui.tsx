import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { dexNumber, humanize } from "~/lib/format";

export type TypeRef = { name: string; label: string };

export type Card = {
  id: number;
  name: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
};

export function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  const headingId = `${useId()}-heading`;
  return (
    <section className="panel" id={id} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}

export function TypeBadge({ type, link = true }: { type: TypeRef; link?: boolean }) {
  const style = { "--type-color": `var(--type-${type.name})` } as React.CSSProperties;
  if (!link) {
    return (
      <span className="type-badge" style={style}>
        {type.label}
      </span>
    );
  }
  return (
    <Link className="type-badge" style={style} to={`/types/${type.name}`}>
      {type.label}
    </Link>
  );
}

export function TypeBadges({ types, link = true }: { types: TypeRef[]; link?: boolean }) {
  return (
    <span className="type-badges">
      {types.map((t) => (
        <TypeBadge key={t.name} type={t} link={link} />
      ))}
    </span>
  );
}

export function Count({ n, noun = "Pokémon" }: { n: number; noun?: string }) {
  return (
    <p className="count">
      {n} {noun}
    </p>
  );
}

export function PokemonCard({ card }: { card: Card }) {
  return (
    <li className="card">
      <Link to={`/pokemon/${card.name}`} className="card-link">
        <img className="card-sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{humanize(card.name)}</span>
      </Link>
      {card.types && card.types.length > 0 && (
        <span className="card-extra">
          <TypeBadges types={card.types} link={false} />
        </span>
      )}
      {card.hidden && <span className="card-extra card-note">Hidden ability</span>}
    </li>
  );
}

export function CardList({ cards }: { cards: Card[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} />
      ))}
    </ul>
  );
}
