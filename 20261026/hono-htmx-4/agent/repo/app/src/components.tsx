import type { Child, FC, PropsWithChildren } from 'hono/jsx';
import { dexNumber, spriteUrl } from './api.js';

export const Layout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href="/static/tokens.css" />
      <link rel="stylesheet" href="/static/styles.css" />
      <script src="/static/htmx.min.js" defer></script>
      <script src="/static/app.js" defer></script>
    </head>
    <body>
      <header class="site-header">
        <div class="container site-header__inner">
          <a class="site-header__brand" href="/">
            Pokédex
          </a>
          <nav aria-label="Main">
            <ul class="site-nav">
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
        <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
);

/** Document title for a page whose h1 is `heading`. */
export const docTitle = (heading: string) => `${heading} – Pokédex`;

export const Section: FC<PropsWithChildren<{ id: string; title: string; class?: string }>> = (props) => (
  <section class={`panel ${props.class ?? ''}`} id={props.id} aria-labelledby={`${props.id}-heading`}>
    <h2 id={`${props.id}-heading`}>{props.title}</h2>
    {props.children}
  </section>
);

export const TypeBadge: FC<{ name: string; label: string; link?: boolean }> = ({ name, label, link = true }) =>
  link ? (
    <a class={`badge type-${name}`} href={`/types/${name}`}>
      {label}
    </a>
  ) : (
    <span class={`badge type-${name}`}>{label}</span>
  );

export type CardData = { id: number; name: string; label: string };

export const PokemonCard: FC<{ p: CardData; children?: Child }> = ({ p, children }) => (
  <li class="card">
    <a class="card__link" href={`/pokemon/${p.name}`}>
      <img class="card__sprite" src={spriteUrl(p.id)} alt="" width="96" height="96" loading="lazy" />
      <span class="card__number">{dexNumber(p.id)}</span>
      <span class="card__name">{p.label}</span>
    </a>
    {children}
  </li>
);

export const CardList: FC<{ items: CardData[]; extra?: (p: CardData, i: number) => Child }> = ({ items, extra }) => (
  <ul class="card-grid">
    {items.map((p, i) => (
      <PokemonCard p={p}>{extra?.(p, i)}</PokemonCard>
    ))}
  </ul>
);

export const Count: FC<{ n: number; noun?: string }> = ({ n, noun = 'Pokémon' }) => (
  <p class="count">
    {n} {noun}
  </p>
);

export const NotFound: FC = () => (
  <>
    <h1>Not found</h1>
    <p>
      <a href="/">Back to the Pokédex</a>
    </p>
  </>
);

export const dash = (v: number | string | null | undefined) => (v == null || v === '' ? '—' : String(v));
