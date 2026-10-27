import Link from "next/link";
import type { TypeInfo } from "@/lib/data";

type Props = { type: TypeInfo; link?: boolean; size?: "sm" | "md" };

export function TypeBadge({ type, link = true, size = "sm" }: Props) {
  const className = `type-badge type-badge--${size}`;
  const style = { "--type-color": `var(--type-${type.name}, var(--color-text-muted))` } as React.CSSProperties;
  if (!link) {
    return (
      <span className={className} style={style}>
        {type.label}
      </span>
    );
  }
  return (
    <Link href={`/types/${type.name}`} className={className} style={style} prefetch={false}>
      {type.label}
    </Link>
  );
}

export function TypeList({ types, link = true }: { types: TypeInfo[]; link?: boolean }) {
  return (
    <span className="type-list">
      {types.map((t) => (
        <TypeBadge key={t.name} type={t} link={link} />
      ))}
    </span>
  );
}
