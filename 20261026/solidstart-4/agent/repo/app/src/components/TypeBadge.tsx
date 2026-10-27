import { A } from "@solidjs/router";
import type { NamedLabel } from "~/lib/types";

/** A type rendered as a coloured pill; a link to the type page unless `plain`. */
export default function TypeBadge(props: { type: NamedLabel; plain?: boolean }) {
  const style = () => ({ "--badge-bg": `var(--type-${props.type.name}, var(--color-text-muted))` });
  return props.plain ? (
    <span class="type-badge" style={style()}>
      {props.type.label}
    </span>
  ) : (
    <A href={`/types/${props.type.name}`} class="type-badge" style={style()}>
      {props.type.label}
    </A>
  );
}
