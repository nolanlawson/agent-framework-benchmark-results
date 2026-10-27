import { effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

/** Keeps the document title in sync with a page's h1 (call in an injection context). */
export function syncTitle(heading: () => string | null): void {
  const title = inject(Title);
  effect(() => {
    const text = heading();
    if (text !== null) title.setTitle(text ? `${text} – Pokédex` : 'Pokédex');
  });
}
