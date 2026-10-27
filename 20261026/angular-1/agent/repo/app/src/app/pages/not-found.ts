import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The not-found page body. Pages that render it also set the "Not found" title. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Not found</h1>
    <p><a routerLink="/">Back to the Pokédex</a></p>
  `,
})
export class NotFound {}
