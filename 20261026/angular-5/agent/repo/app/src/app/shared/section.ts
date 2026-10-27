import { Component, computed, input } from '@angular/core';

/** A titled card-like region, labelled by its heading. */
@Component({
  selector: 'app-section',
  template: `
    <section class="panel" [attr.id]="anchor()" [attr.aria-labelledby]="headingId()">
      <h2 [id]="headingId()">{{ heading() }}</h2>
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0 0 var(--space-4);
      font-size: var(--text-lg);
      font-weight: var(--weight-normal);
      line-height: var(--leading-tight);
    }
  `,
})
export class Section {
  readonly heading = input.required<string>();
  /** Optional element id, so the section can be linked to with a fragment. */
  readonly anchor = input<string>();

  protected readonly headingId = computed(
    () => `${this.heading().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-heading`,
  );
}
