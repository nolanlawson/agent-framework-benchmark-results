import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTitle } from '../../core/page-title';
import { TypeRef } from '../../core/models';

@Component({
  selector: 'app-types',
  imports: [RouterLink],
  template: `
    <h1>Types</h1>
    <ul class="type-grid" role="list">
      @for (type of data(); track type.name) {
        <li>
          <a [routerLink]="['/types', type.name]" [style.--type-color]="'var(--type-' + type.name + ')'">{{
            type.label
          }}</a>
        </li>
      }
    </ul>
  `,
  styles: `
    .type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .type-grid a {
      display: block;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--type-color, var(--color-text-muted));
      color: var(--color-on-type);
      text-align: center;
      text-decoration: none;
    }

    .type-grid a:hover {
      text-decoration: underline;
    }
  `,
})
export class TypesPage {
  readonly data = input.required<TypeRef[]>();

  constructor() {
    inject(PageTitle).set('Types');
  }
}
