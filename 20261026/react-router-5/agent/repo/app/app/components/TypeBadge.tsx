import { Link } from "react-router";
import type { TypeRef } from "../lib/pokeapi.server";

const style = (type: TypeRef) => ({ "--badge-bg": `var(--type-${type.name}, var(--color-text-muted))` }) as React.CSSProperties;

export function TypeBadge({ type }: { type: TypeRef }) {
  return (
    <span className="type-badge" style={style(type)}>
      {type.label}
    </span>
  );
}

export function TypeLink({ type }: { type: TypeRef }) {
  return (
    <Link to={`/types/${type.name}`} className="type-badge" style={style(type)}>
      {type.label}
    </Link>
  );
}
