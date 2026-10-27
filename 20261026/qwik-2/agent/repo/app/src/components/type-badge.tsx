import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { TypeRef } from "~/lib/types";

/** A type as a coloured pill, optionally linking to the type page. */
export const TypeBadge = component$<{ type: TypeRef; link?: boolean }>(({ type, link }) => {
  const style = `--badge-bg: var(--type-${type.name}, var(--color-text-muted))`;
  return link ? (
    <Link class="type-badge" style={style} href={`/types/${type.name}`}>
      {type.label}
    </Link>
  ) : (
    <span class="type-badge" style={style}>
      {type.label}
    </span>
  );
});
