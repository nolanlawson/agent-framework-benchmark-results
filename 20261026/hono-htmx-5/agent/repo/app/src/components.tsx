import type { Child, PropsWithChildren } from 'hono/jsx';
import { dexNumber, humanize, spriteUrl, type TypeRef } from './api';

export const Layout = ({ title, children }: PropsWithChildren<{ title?: string }>) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title ? `${title} – Pokédex` : 'Pokédex'}</title>
      <link rel="stylesheet" href="/static/tokens.css" />
      <link rel="stylesheet" href="/static/style.css" />
      <script src="/static/htmx.min.js" defer></script>
      <script src="/static/app.js" defer></script>
    </head>
    <body>
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="/">
            Pokédex
          </a>
          <nav aria-label="Main">
            <ul>
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
      <main class="container">{children}</main>
      <footer class="site-footer">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
);

export const Section = ({ id, title, children }: PropsWithChildren<{ id: string; title: string }>) => (
  <section class="panel" id={id} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{title}</h2>
    {children}
  </section>
);

export const TypeBadge = ({ type, link }: { type: TypeRef; link?: boolean }) =>
  link ? (
    <a class={`badge type-${type.name}`} href={`/types/${type.name}`}>
      {type.label}
    </a>
  ) : (
    <span class={`badge type-${type.name}`}>{type.label}</span>
  );

export const Card = ({ id, name, types, extra }: { id: number; name: string; types?: TypeRef[]; extra?: Child }) => (
  <li>
    <a class="card" href={`/pokemon/${name}`}>
      <img src={spriteUrl(id)} alt="" width={96} height={96} loading="lazy" />
      <span class="dex">{dexNumber(id)}</span>
      <span class="card-name">{humanize(name)}</span>
      {types && types.length > 0 && (
        <span class="badges">
          {types.map((t) => (
            <TypeBadge type={t} />
          ))}
        </span>
      )}
      {extra}
    </a>
  </li>
);

export const CardList = ({ children }: PropsWithChildren) => <ul class="cards">{children}</ul>;

export const display = (value: number | string | null | undefined) => (value === null || value === undefined ? '—' : String(value));

export const NotFound = () => (
  <Layout title="Not found">
    <h1>Not found</h1>
    <p>
      <a href="/">Back to the Pokédex</a>
    </p>
  </Layout>
);
