import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { TypeRef } from "~/lib/format";

/** A coloured type pill; a link to the type page unless `plain`. */
export const TypeBadge = component$<{ type: TypeRef; plain?: boolean }>(({ type, plain }) => {
  const style = { "--badge-bg": `var(--type-${type.name}, var(--color-text-muted))` };
  return plain ? (
    <span class="badge" style={style}>
      {type.label}
    </span>
  ) : (
    <Link class="badge" style={style} href={`/types/${type.name}`}>
      {type.label}
    </Link>
  );
});
