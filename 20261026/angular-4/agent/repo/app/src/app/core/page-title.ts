import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

const SITE_NAME = 'Pokédex';

/** Sets the document title from a page's `h1`: `<h1 text> – Pokédex`. */
@Service()
export class PageTitle {
  private readonly title = inject(Title);

  set(heading: string | null): void {
    this.title.setTitle(heading ? `${heading} – ${SITE_NAME}` : SITE_NAME);
  }
}
