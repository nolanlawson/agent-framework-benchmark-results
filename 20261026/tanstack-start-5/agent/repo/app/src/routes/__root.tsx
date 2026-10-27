import type { ReactNode } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { NotFound } from '../components/ui'
import { pageTitle } from '../lib/format'
import styles from '../styles.css?url'

export const Route = createRootRoute({
  head: ({ matches }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // Child routes set their own title. When a URL matches nothing, or a loader throws
      // notFound(), the root renders the not-found page and child heads don't run.
      { title: matches.some((m) => m._notFound || m.status === 'notFound') ? pageTitle('Not found') : 'Pokédex' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link to="/" className="brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul>
                <li>
                  <Link to="/">Pokémon</Link>
                </li>
                <li>
                  <Link to="/types">Types</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="container main">{children}</main>
        <footer className="site-footer">
          <p className="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
