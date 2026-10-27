import type { Metadata } from "next";
import Link from "next/link";
import "./tokens.css";
import "./globals.css";

// Every page reads live API data, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Pokédex", template: "%s – Pokédex" },
  description: "A browsable encyclopedia of Pokémon, moves, abilities and types.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/" className="site-header__brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="site-nav">
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
        <main className="container site-main">{children}</main>
        <footer className="site-footer">
          <p className="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </p>
        </footer>
      </body>
    </html>
  );
}
