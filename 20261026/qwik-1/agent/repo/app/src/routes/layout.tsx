import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <header class="site-header">
        <div class="container header-inner">
          <Link href="/" class="brand">
            Pokédex
          </Link>
          <nav aria-label="Main">
            <ul class="nav-list">
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
      <main class="container main">
        <Slot />
      </main>
      <footer class="site-footer">
        <p class="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </p>
      </footer>
    </>
  );
});
