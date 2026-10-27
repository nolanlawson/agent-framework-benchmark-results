import { Link, createFileRoute } from '@tanstack/react-router'
import { pageTitle } from '../lib/format'
import { fetchTypes } from '../lib/api'

export const Route = createFileRoute('/types/')({
  loader: () => fetchTypes(),
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
              className="type-tile"
              style={{ '--badge-bg': `var(--type-${t.name})` } as React.CSSProperties}
              to="/types/$name"
              params={{ name: t.name }}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
