import type { Child, PropsWithChildren } from 'hono/jsx'
import { jsxRenderer } from 'hono/jsx-renderer'
import { spriteUrl, type Species } from './data.js'
import { assetUrl } from './assets.js'
import { dexNumber, humanize } from './util.js'

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title?: string }): Response | Promise<Response>
  }
}

export const renderer = jsxRenderer(({ children, title }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title ? `${title} – Pokédex` : 'Pokédex'}</title>
      <meta name="htmx-config" content='{"includeIndicatorStyles":false,"defaultSettleDelay":0}' />
      <link rel="stylesheet" href={assetUrl('tokens.css')} />
      <link rel="stylesheet" href={assetUrl('app.css')} />
      <script src={assetUrl('htmx.min.js')} defer></script>
    </head>
    <body>
      <header class="site-header">
        <div class="container site-header__inner">
          <a class="brand" href="/">
            Pokédex
          </a>
          <nav aria-label="Main">
            <ul class="nav-links">
              <li>
                <a href="/">Pokémon</a>
              </li>
              <li>
                <a href="/types">Types</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main class="container page">{children}</main>
      <footer class="site-footer">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
))

export const TypeBadge = ({ name, label, link = true }: { name: string; label: string; link?: boolean }) =>
  link ? (
    <a class={`type-badge type-${name}`} href={`/types/${name}`}>
      {label}
    </a>
  ) : (
    <span class={`type-badge type-${name}`}>{label}</span>
  )

export const Section = ({ id, title, children, class: cls }: PropsWithChildren<{ id: string; title: string; class?: string }>) => (
  <section class={`panel ${cls ?? ''}`} aria-labelledby={`${id}-heading`} id={id}>
    <h2 id={`${id}-heading`}>{title}</h2>
    {children}
  </section>
)

export const PokemonCard = ({ species, extra }: { species: Species; extra?: Child }) => (
  <li class="card">
    <a href={`/pokemon/${species.name}`}>
      <img src={spriteUrl(species.id)} alt="" width="96" height="96" loading="lazy" decoding="async" />
      <span class="card__dex">{dexNumber(species.id)}</span>
      <span class="card__name">{humanize(species.name)}</span>
      {extra}
    </a>
  </li>
)

export const CardGrid = ({ children }: PropsWithChildren) => <ul class="card-grid">{children}</ul>

export const Count = ({ n, noun = 'Pokémon' }: { n: number; noun?: string }) => (
  <p class="count">
    {n} {noun}
  </p>
)
