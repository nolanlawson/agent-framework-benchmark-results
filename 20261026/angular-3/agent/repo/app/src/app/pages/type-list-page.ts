import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Loaded, TypeListData } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';

@Component({
  selector: 'app-type-list-page',
  imports: [RouterLink, NotFoundPage],
  template: `
    @if (types(); as types) {
      <h1>Types</h1>
      <ul class="types">
        @for (t of types; track t.name) {
          <li>
            <a class="type-{{ t.name }}" [routerLink]="['/types', t.name]">{{ t.label }}</a>
          </li>
        }
      </ul>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .types {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a {
      display: block;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--type-color, var(--type-normal));
      color: var(--color-on-type);
      text-align: center;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `,
})
export class TypeListPage {
  readonly data = input.required<Loaded<TypeListData>>();
  protected readonly types = computed(() => {
    const data = this.data();
    return 'types' in data ? data.types : null;
  });

  constructor() {
    syncTitle(() => (this.types() ? 'Types' : null));
  }
}
