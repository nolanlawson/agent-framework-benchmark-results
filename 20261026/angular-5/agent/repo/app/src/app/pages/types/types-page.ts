import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { NamedRef } from '../../data/models';
import { syncPageTitle } from '../../shared/page-title';

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="types">
      @for (type of types(); track type.name) {
        <li>
          <a [routerLink]="['/types', type.name]" [style.--type-color]="'var(--type-' + type.name + ')'">
            {{ type.label }}
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .types {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a {
      display: block;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--type-color, var(--color-text-muted));
      color: var(--color-on-type);
      text-align: center;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `,
})
export default class TypesPage {
  readonly types = input.required<NamedRef[]>();

  constructor() {
    syncPageTitle(() => 'Types');
  }
}
