import { isRouteErrorResponse, Link, Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import { NotFound } from "./components/NotFound";
import { pageTitle } from "./lib/format";
import "./styles/tokens.css";
import "./styles/app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <Link to="/" className="site-header__brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="site-nav">
                <li>
                  <NavLink to="/" end>
                    Pokémon
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/types">Types</NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="page">{children}</main>
        <footer className="site-footer">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  console.error(error);
  return (
    <>
      <title>{pageTitle("Something went wrong")}</title>
      <h1>Something went wrong</h1>
      <p>The Pokédex couldn't load this page. Please try again in a moment.</p>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
