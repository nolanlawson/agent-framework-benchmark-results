import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTitle } from '../core/page-title';

/** Shown for unknown URLs and for names the API doesn't know. Answers 404 when server-rendered. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
  styles: `
    p {
      margin-bottom: var(--space-4);
    }
  `,
})
export class NotFound {
  constructor() {
    inject(PageTitle).set('Not found');
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
