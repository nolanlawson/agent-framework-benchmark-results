import { Component, RESPONSE_INIT, inject } from '@angular/core';
import { CanMatchFn, Router, RouterLink } from '@angular/router';
import { PageTitle } from '../core/page-title';

/** Navigation state that marks a re-navigation to show `LoadError` after a failed load. */
export const LOAD_ERROR_STATE = 'loadError';

/** Matches only navigations redirected here by the router's navigation error handler. */
export const isLoadErrorNavigation: CanMatchFn = () =>
  inject(Router).currentNavigation()?.extras.state?.[LOAD_ERROR_STATE] === true;

/** Shown when the API fails for a reason other than "not found". */
@Component({
  selector: 'app-load-error',
  imports: [RouterLink],
  template: `
    <h1>Something went wrong</h1>
    <p>The Pokédex data couldn't be loaded. Please try again in a moment.</p>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class LoadError {
  constructor() {
    inject(PageTitle).set('Something went wrong');
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 502;
  }
}
