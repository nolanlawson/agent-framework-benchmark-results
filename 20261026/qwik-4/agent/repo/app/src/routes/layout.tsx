import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export default component$(() => (
  <>
    <header class="site-header">
      <div class="container site-header-inner">
        <Link class="brand" href="/">
          Pokédex
        </Link>
        <nav aria-label="Main">
          <ul>
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
