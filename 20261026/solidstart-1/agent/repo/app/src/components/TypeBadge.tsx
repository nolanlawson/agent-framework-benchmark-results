import type { Ref } from "~/lib/types";

export function TypeBadge(props: { type: Ref; link?: boolean; size?: "sm" | "md" }) {
  const cls = () => `type-badge type-badge--${props.size ?? "sm"}`;
  const style = () => ({ "--badge-bg": `var(--type-${props.type.name}, var(--color-text-muted))` });
  return props.link === false ? (
    <span class={cls()} style={style()}>
      {props.type.label}
    </span>
  ) : (
    <a class={cls()} style={style()} href={`/types/${props.type.name}`}>
      {props.type.label}
    </a>
  );
}

export function TypeBadges(props: { types: Ref[]; link?: boolean }) {
  return (
    <span class="type-badges">
      {props.types.map((t) => (
        <TypeBadge type={t} link={props.link} />
      ))}
    </span>
  );
}
