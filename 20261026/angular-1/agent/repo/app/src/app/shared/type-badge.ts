import { Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A type label in the type's colour; a link to the type page unless `static` is set. */
@Component({
  selector: 'app-type-badge',
  imports: [RouterLink],
  template: `
    @if (static()) {
      <span class="type-badge" [style.--badge-bg]="color()">{{ label() }}</span>
    } @else {
      <a class="type-badge" [style.--badge-bg]="color()" [routerLink]="['/types', name()]">{{ label() }}</a>
    }
  `,
  host: { style: 'display: contents' },
})
export class TypeBadge {
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly static = input(false, { transform: booleanAttribute });

  protected color() {
    return `var(--type-${this.name()}, var(--color-text-muted))`;
  }
}
