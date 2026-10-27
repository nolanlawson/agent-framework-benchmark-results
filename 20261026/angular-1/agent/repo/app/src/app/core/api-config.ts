import { DOCUMENT, InjectionToken, inject } from '@angular/core';

const DEFAULT_API_BASE_URL = 'http://localhost:9000';

/**
 * Origin of the PokeAPI server. The production server writes it into
 * `<meta name="api-base-url">` at request time, so the same build works against any API.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => {
    const content = inject(DOCUMENT).querySelector('meta[name="api-base-url"]')?.getAttribute('content') ?? '';
    const base = /^https?:\/\//.test(content) ? content : DEFAULT_API_BASE_URL;
    return base.replace(/\/+$/, '');
  },
});
