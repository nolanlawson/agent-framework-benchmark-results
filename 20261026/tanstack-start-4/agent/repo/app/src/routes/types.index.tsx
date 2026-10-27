import { createFileRoute, Link } from '@tanstack/react-router'
import { pageTitle } from '../lib/format'
import { fetchTypes } from '../server/functions'

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
              to="/types/$name"
              params={{ name: t.name }}
              className="type-tile"
              style={{ backgroundColor: `var(--type-${t.name}, var(--color-text-muted))` }}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
