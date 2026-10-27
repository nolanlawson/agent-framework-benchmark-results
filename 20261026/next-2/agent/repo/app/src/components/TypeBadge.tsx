import Link from 'next/link';

export function TypeBadge({ type, label, link = true }: { type: string; label: string; link?: boolean }) {
  const style = { '--badge-bg': `var(--type-${type}, var(--color-text-muted))` } as React.CSSProperties;
  if (!link) {
    return (
      <span className="type-badge" style={style}>
        {label}
      </span>
    );
  }
  return (
    <Link href={`/types/${type}`} className="type-badge" style={style}>
      {label}
    </Link>
  );
}
