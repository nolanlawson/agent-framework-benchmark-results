import { effect, inject, Service } from '@angular/core';
import { Title } from '@angular/platform-browser';

/** Keeps the document title in sync with a page's main heading. */
@Service()
export class PageTitle {
  private readonly title = inject(Title);

  set(heading: string | null): void {
    this.title.setTitle(heading ? `${heading} – Pokédex` : 'Pokédex');
  }
}

/** Sets the document title from `heading` whenever it changes. Call in an injection context. */
export function syncPageTitle(heading: () => string | null): void {
  const pageTitle = inject(PageTitle);
  effect(() => pageTitle.set(heading()));
}
