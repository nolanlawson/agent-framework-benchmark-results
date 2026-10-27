import type { Child, FC } from 'hono/jsx';
import { jsxRenderer } from 'hono/jsx-renderer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type CardData, dexNumber, humanize, spriteUrl, type TypeInfo, typeLabel } from './data.js';

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string; scripts?: boolean }): Response | Promise<Response>;
  }
}

// Content hashes in asset URLs, so browsers never use a stale cached copy.
const asset = (file: string) => {
  const body = readFileSync(new URL(`./static/${file}`, import.meta.url));
  return `/static/${file}?v=${createHash('sha256').update(body).digest('hex').slice(0, 10)}`;
};
const ASSETS = {
  tokens: asset('tokens.css'),
  style: asset('style.css'),
  htmx: asset('htmx.min.js'),
  client: asset('client.js'),
};

export const renderer = jsxRenderer(({ children, title, scripts }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title ? `${title} – Pokédex` : 'Pokédex'}</title>
      <link rel="stylesheet" href={ASSETS.tokens} />
      <link rel="stylesheet" href={ASSETS.style} />
      {scripts && <script src={ASSETS.htmx} defer></script>}
      {scripts && <script src={ASSETS.client} defer></script>}
    </head>
    <body>
      <header class="site-header">
        <div class="container site-header__inner">
          <a class="site-header__home" href="/">
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
      <main class="container main">{children}</main>
      <footer class="site-footer">
        <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
));

export const Section: FC<{ id: string; title: string; class?: string; children?: Child }> = ({ id, title, children, ...rest }) => (
  <section class={`panel ${rest.class ?? ''}`.trim()} id={id} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{title}</h2>
    {children}
  </section>
);

export const TypeBadge: FC<{ name: string; label: string; link?: boolean }> = ({ name, label, link }) =>
  link ? (
    <a class={`badge type-${name}`} href={`/types/${name}`}>
      {label}
    </a>
  ) : (
    <span class={`badge type-${name}`}>{label}</span>
  );

export const TypeLinks: FC<{ names: string[]; types: Map<string, TypeInfo> }> = ({ names, types }) => (
  <ul class="badges">
    {names.map((n) => (
      <li>
        <TypeBadge name={n} label={typeLabel(types, n)} link />
      </li>
    ))}
  </ul>
);

export const Card: FC<{ card: CardData; types?: Map<string, TypeInfo> }> = ({ card, types }) => (
  <li class="card">
    <a class="card__link" href={`/pokemon/${card.name}`}>
      <img class="card__sprite" src={spriteUrl(card.id)} alt="" width={96} height={96} loading="lazy" />
      <span class="card__dex">{dexNumber(card.id)}</span>
      <span class="card__name">{humanize(card.name)}</span>
    </a>
    {card.types && types && (
      <span class="badges card__types">
        {card.types.map((t) => (
          <TypeBadge name={t} label={typeLabel(types, t)} />
        ))}
      </span>
    )}
    {card.hidden && <span class="card__note">Hidden ability</span>}
  </li>
);

export const CardList: FC<{ cards: CardData[]; types?: Map<string, TypeInfo> }> = ({ cards, types }) => (
  <ul class="cards">
    {cards.map((card) => (
      <Card card={card} types={types} />
    ))}
  </ul>
);

export const Count: FC<{ n: number; noun?: string }> = ({ n, noun = 'Pokémon' }) => (
  <p class="count">
    {n} {noun}
  </p>
);

export const DASH = '—';
export const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? DASH : String(v));
