/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import stylesUrl from '../styles.css?url'
import { NotFound } from '../components/NotFound'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Pokédex' },
    ],
    links: [
      { rel: 'stylesheet', href: stylesUrl },
      { rel: 'icon', href: 'data:,' },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return <NotFound />
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link to="/" className="site-title">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="site-nav">
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
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
