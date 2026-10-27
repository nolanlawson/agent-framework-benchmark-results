import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./styles/tokens.css";
import "./styles/app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <header class="site-header">
            <div class="container header-inner">
              <a class="brand" href="/">
                Pokédex
              </a>
              <nav aria-label="Main">
                <a href="/">Pokémon</a>
                <a href="/types">Types</a>
              </nav>
            </div>
          </header>
          <main class="container">
            <Suspense>{props.children}</Suspense>
          </main>
          <footer class="site-footer">
            <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </footer>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
