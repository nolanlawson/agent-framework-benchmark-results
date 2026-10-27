import { Component, input } from '@angular/core';
import { NotFound } from '../pages/not-found';
import { NotFoundError } from '../core/poke-api';

/** Shown in place of a page while its data loads or when loading failed. */
@Component({
  selector: 'app-load-state',
  imports: [NotFound],
  template: `
    @if (isNotFound()) {
      <app-not-found />
    } @else if (error()) {
      <h1>Something went wrong</h1>
      <p>The Pokédex data couldn't be loaded. Please try again.</p>
    } @else {
      <p class="loading" role="status">Loading…</p>
    }
  `,
})
export class LoadState {
  readonly error = input<unknown>();

  protected isNotFound() {
    return this.error() instanceof NotFoundError;
  }
}
