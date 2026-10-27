import { html } from '@gracile/gracile/server-html';

export const SITE_NAME = 'Pokédex';

export const document = ({ title } = {}) => html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href=${new URL('./styles/global.css', import.meta.url).pathname} />
      <script type="module" src=${new URL('./document.client.js', import.meta.url).pathname}></script>
      <title>${title ? `${title} – ${SITE_NAME}` : SITE_NAME}</title>
      <link rel="icon" href="data:," />
    </head>
    <body>
      <header class="site-header">
        <div class="container site-header__inner">
          <a class="site-header__brand" href="/">Pokédex</a>
          <nav aria-label="Main">
            <ul class="site-nav">
              <li><a href="/">Pokémon</a></li>
              <li><a href="/types">Types</a></li>
            </ul>
          </nav>
        </div>
      </header>
      <main class="container site-main">
        <route-template-outlet></route-template-outlet>
      </main>
      <footer class="site-footer">
        <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
`;
