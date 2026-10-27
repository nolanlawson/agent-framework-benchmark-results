import { Component, inject, resource } from '@angular/core';
import { englishName } from '../core/format';
import { PokeApi } from '../core/poke-api';
import { TypeBadge } from '../shared/type-badge';

@Component({
  selector: 'app-types-page',
  imports: [TypeBadge],
  template: `
    <h1>Types</h1>
    @if (types.hasValue()) {
      <ul class="type-grid">
        @for (type of types.value(); track type.name) {
          <li><app-type-badge [name]="type.name" [label]="type.label" /></li>
        }
      </ul>
    } @else if (types.error()) {
      <p class="notice">The types couldn't be loaded. Please try again.</p>
    } @else {
      <p class="loading" role="status">Loading…</p>
    }
  `,
})
export class TypesPage {
  private readonly api = inject(PokeApi);

  protected readonly types = resource({
    loader: async () => (await this.api.types()).map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
  });
}
