import type { Metadata } from 'next';
import Link from 'next/link';
import { getTypes } from '@/lib/api';

export const metadata: Metadata = { title: 'Types' };

export default async function TypesPage() {
  const types = await getTypes();
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link
              href={`/types/${t.name}`}
              className="type-tile"
              style={{ '--badge-bg': `var(--type-${t.name})` } as React.CSSProperties}
              prefetch={false}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
