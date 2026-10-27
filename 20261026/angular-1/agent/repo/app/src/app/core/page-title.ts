import { effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NotFoundError } from './poke-api';

export const SITE_NAME = 'Pokédex';

/**
 * Keeps the document title in sync with a page's heading: `<h1 text> – Pokédex`, or just
 * `Pokédex` while the heading is unknown. Call from an injection context.
 */
export function syncPageTitle(heading: () => string | null | undefined): void {
  const title = inject(Title);
  effect(() => {
    const text = heading();
    title.setTitle(text ? `${text} – ${SITE_NAME}` : SITE_NAME);
  });
}

/** Heading for a page whose data failed to load, matching what `LoadState` shows. */
export function errorHeading(error: unknown): string {
  return error instanceof NotFoundError ? 'Not found' : 'Something went wrong';
}
