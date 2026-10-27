/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFound } from '../components/NotFound'
import { pageTitle } from '../lib/format'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: () => (
    <>
      <title>{pageTitle('Not found')}</title>
      <NotFound />
    </>
  ),
})

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
              <ul className="nav-links">
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
          <p className="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
