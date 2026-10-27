import { Link, createFileRoute } from '@tanstack/react-router'
import { pageTitle } from '../lib/format'
import { getTypes } from '../lib/pokedex.functions'

export const Route = createFileRoute('/types/')({
  loader: () => getTypes(),
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
            <Link to="/types/$name" params={{ name: t.name }} style={{ background: `var(--type-${t.name})` }}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
