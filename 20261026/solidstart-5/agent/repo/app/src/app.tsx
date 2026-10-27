import { MetaProvider } from "@solidjs/meta";
import { A, Router, useLocation } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, ErrorBoundary, on, Suspense, type ParentProps } from "solid-js";
import { PageTitle } from "./components/ui";
import "./styles/tokens.css";
import "./styles/app.css";

function ErrorPage(props: { error: unknown; reset: () => void }) {
  console.error(props.error);
  // Leaving the page clears the error, so other pages render normally again.
  const location = useLocation();
  createEffect(on(() => location.pathname + location.search, () => props.reset(), { defer: true }));
  return (
    <>
      <PageTitle heading="Something went wrong" />
      <HttpStatusCode code={503} />
      <h1 class="page-title">Something went wrong</h1>
      <p>The Pokédex couldn't load this page. The data service may be unavailable.</p>
      <p>
        <button type="button" class="link-button" onClick={() => props.reset()}>
          Try again
        </button>{" "}
        or <a href="/">go back to the Pokédex</a>.
      </p>
    </>
  );
}

function Layout(props: ParentProps) {
  return (
    <MetaProvider>
      <a class="skip-link" href="#main">
        Skip to content
      </a>
      <header class="site-header">
        <div class="container site-header__inner">
          <a class="site-header__brand" href="/">
            Pokédex
          </a>
          <nav aria-label="Main">
            <ul class="site-nav">
              <li>
                <A href="/" end>
                  Pokémon
                </A>
              </li>
              <li>
                <A href="/types">Types</A>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" class="container site-main">
        <ErrorBoundary fallback={(error, reset) => <ErrorPage error={error} reset={reset} />}>
          <Suspense>{props.children}</Suspense>
        </ErrorBoundary>
      </main>
      <footer class="site-footer">
        <div class="container">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </div>
      </footer>
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Router root={Layout}>
      <FileRoutes />
    </Router>
  );
}
