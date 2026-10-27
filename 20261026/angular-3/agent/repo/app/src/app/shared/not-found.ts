import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { syncTitle } from './page-title';

/** The "Not found" page content; also sets a 404 status when rendered on the server. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFoundPage {
  constructor() {
    syncTitle(() => 'Not found');
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
  }
}
