import { component$, Slot } from "@builder.io/qwik";
import { Link, type RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ cacheControl }) => {
  // Pages reflect live API data, so they aren't cached by the browser or proxy.
  cacheControl({ noCache: true, private: true });
};

export default component$(() => (
  <>
    <header class="site-header">
      <div class="container site-header-inner">
        <Link class="site-logo" href="/">
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
      <p class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </p>
    </footer>
  </>
));
