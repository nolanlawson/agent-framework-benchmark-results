import { component$, Slot } from "@builder.io/qwik";
import { Link, type RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = ({ headers }) => {
  // Pages reflect live API data, so they must not be cached.
  headers.set("Cache-Control", "no-store");
};

export default component$(() => (
  <>
    <header class="site-header">
      <div class="container site-header__inner">
        <Link href="/" class="site-header__brand">
          Pokédex
        </Link>
        <nav aria-label="Main">
          <ul class="site-nav">
            <li>
              <Link href="/">Pokémon</Link>
            </li>
            <li>
              <Link href="/types">Types</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <Slot />
    </main>
    <footer class="site-footer">
      <div class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </div>
    </footer>
  </>
));
