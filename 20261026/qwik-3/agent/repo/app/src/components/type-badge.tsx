import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

interface Props {
  name: string;
  label: string;
  link?: boolean;
  large?: boolean;
}

export const TypeBadge = component$<Props>(({ name, label, link, large }) => {
  const cls = ["type-badge", large && "type-badge--lg"];
  const style = { "--badge-bg": `var(--type-${name}, var(--color-text-muted))` };
  return link ? (
    <Link href={`/types/${name}`} class={cls} style={style}>
      {label}
    </Link>
  ) : (
    <span class={cls} style={style}>
      {label}
    </span>
  );
});
