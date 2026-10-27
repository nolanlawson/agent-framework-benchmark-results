import { booleanAttribute, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { NamedRef } from '../data/models';

/** A type's name on its type colour; a link to the type page unless `plain`. */
@Component({
  selector: 'app-type-badge',
  imports: [RouterLink],
  template: `
    @if (plain()) {
      <span class="badge" [style.--badge-color]="color()">{{ type().label }}</span>
    } @else {
      <a class="badge" [style.--badge-color]="color()" [routerLink]="['/types', type().name]">{{ type().label }}</a>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .badge {
      display: inline-block;
      padding: 0.1875rem var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--badge-color);
      color: var(--color-on-type);
      font-size: var(--text-xs);
      line-height: var(--leading-normal);
      text-decoration: none;
      white-space: nowrap;
    }
    a.badge:hover {
      text-decoration: underline;
    }
  `,
})
export class TypeBadge {
  readonly type = input.required<NamedRef>();
  readonly plain = input(false, { transform: booleanAttribute });

  protected color(): string {
    return `var(--type-${this.type().name}, var(--color-text-muted))`;
  }
}
