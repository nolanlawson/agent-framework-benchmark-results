import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pokédex', template: '%s – Pokédex' },
  description: 'A browsable encyclopedia of Pokémon, moves, abilities and types.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="nav-list">
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
        <main className="container main">{children}</main>
        <footer className="site-footer">
          <p className="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </body>
    </html>
  );
}
