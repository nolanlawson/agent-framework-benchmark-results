import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TypeRef } from '../core/models';

/** A type pill, colored by type. Links to the type page unless `link` is false. */
@Component({
  selector: 'app-type-badge',
  imports: [RouterLink],
  template: `
    @if (link()) {
      <a class="type-badge" [style.--type-color]="color()" [routerLink]="['/types', type().name]">{{
        type().label
      }}</a>
    } @else {
      <span class="type-badge" [style.--type-color]="color()">{{ type().label }}</span>
    }
  `,
  host: { class: 'type-badge-host' },
})
export class TypeBadge {
  readonly type = input.required<TypeRef>();
  readonly link = input(true);

  protected color() {
    return `var(--type-${this.type().name}, var(--color-text-muted))`;
  }
}
