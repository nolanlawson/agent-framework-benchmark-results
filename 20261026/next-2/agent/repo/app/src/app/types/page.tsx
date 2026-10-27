import type { Metadata } from 'next';
import Link from 'next/link';
import { englishName, getTypes } from '@/lib/api';

export const metadata: Metadata = { title: 'Types' };

export default async function TypesPage() {
  const types = await getTypes();
  return (
    <>
      <h1 className="page-title">Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link
              href={`/types/${t.name}`}
              className="type-tile"
              style={{ '--badge-bg': `var(--type-${t.name}, var(--color-text-muted))` } as React.CSSProperties}
            >
              {englishName(t.names, t.name)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
