import { createFileRoute, Link } from '@tanstack/react-router'
import { fetchTypeList } from '../server/functions'
import { pageTitle } from '../lib/format'

export const Route = createFileRoute('/types/')({
  loader: () => fetchTypeList(),
  head: () => ({ meta: [{ title: pageTitle('Types') }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link
              to="/types/$name"
              params={{ name: t.name }}
              className="type-tile"
              style={{ '--badge-bg': `var(--type-${t.name}, var(--color-text-muted))` } as React.CSSProperties}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
