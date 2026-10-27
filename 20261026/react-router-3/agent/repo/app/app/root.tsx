import { isRouteErrorResponse, Link, Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { Route } from "./+types/root";
import { pageTitle } from "./lib/format";
import "./tokens.css";
import "./app.css";

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
          <div className="container site-header-inner">
            <Link to="/" className="brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="nav-list">
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
        <main className="container site-main">{children}</main>
        <footer className="site-footer">
          <p className="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
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
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const heading = notFound ? "Not found" : "Something went wrong";
  if (!notFound) console.error(error);
  return (
    <>
      <title>{pageTitle(heading)}</title>
      <h1>{heading}</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
