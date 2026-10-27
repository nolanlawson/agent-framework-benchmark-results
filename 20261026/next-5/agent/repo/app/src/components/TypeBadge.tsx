import Link from 'next/link';

export function TypeBadge({ name, label, link = false }: { name: string; label: string; link?: boolean }) {
  const style = { '--badge-bg': `var(--type-${name}, var(--color-text-muted))` } as React.CSSProperties;
  if (link) {
    return (
      <Link href={`/types/${name}`} className="badge" style={style} prefetch={false}>
        {label}
      </Link>
    );
  }
  return (
    <span className="badge" style={style}>
      {label}
    </span>
  );
}

export function TypeBadges({ types, link = false }: { types: { name: string; label: string }[]; link?: boolean }) {
  return (
    <span className="badges">
      {types.map((t) => (
        <TypeBadge key={t.name} {...t} link={link} />
      ))}
    </span>
  );
}
