import Link from 'next/link';

type Props = { name: string; label: string; link?: boolean; small?: boolean };

/** A type shown as a colored pill; a link to the type page when `link` is set. */
export function TypeBadge({ name, label, link, small }: Props) {
  const className = `type-badge${small ? ' type-badge-sm' : ''}`;
  const style = { background: `var(--type-${name}, var(--color-text-muted))` };
  if (link) {
    return (
      <Link href={`/types/${name}`} className={className} style={style}>
        {label}
      </Link>
    );
  }
  return (
    <span className={className} style={style}>
      {label}
    </span>
  );
}
