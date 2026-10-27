/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { pageTitle } from '../lib/format'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: pageTitle() },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: Layout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
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
      <main className="container site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </div>
      </footer>
    </>
  )
}
