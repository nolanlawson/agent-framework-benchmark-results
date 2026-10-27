import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NamedLabel } from '../models';

/** A colored type label; a link to the type page unless `link` is false. */
@Component({
  selector: 'app-type-badge',
  imports: [RouterLink],
  template: `
    @if (link()) {
      <a class="type-badge type-{{ type().name }}" [routerLink]="['/types', type().name]">{{ type().label }}</a>
    } @else {
      <span class="type-badge type-{{ type().name }}">{{ type().label }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class TypeBadge {
  readonly type = input.required<NamedLabel>();
  readonly link = input(true);
}
