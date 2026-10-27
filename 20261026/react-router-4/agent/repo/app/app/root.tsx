import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { pageTitle } from "./lib/format";
import "./tokens.css";
import "./app.css";

export const meta: Route.MetaFunction = ({ error }) => [
  { title: error ? pageTitle(errorHeading(error)) : "Pokédex" },
];

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
            <Link to="/" className="site-header__home">
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

function errorHeading(error: unknown) {
  return isRouteErrorResponse(error) && error.status === 404 ? "Not found" : "Something went wrong";
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const heading = errorHeading(error);
  return (
    <>
      <h1 className="page-title">{heading}</h1>
      {heading !== "Not found" && <p>The Pokédex couldn’t load this page. Please try again.</p>}
      <p className="error-home">
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
