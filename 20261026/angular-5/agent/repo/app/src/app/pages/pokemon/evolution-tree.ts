import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EvolutionNode } from '../../data/models';

/** An evolution chain as nested lists: each species' evolutions are a list inside its item. */
@Component({
  selector: 'app-evolution-tree',
  imports: [RouterLink],
  template: `
    <ul>
      @for (node of nodes(); track node.name) {
        <li>
          <a [routerLink]="['/pokemon', node.name]">{{ node.label }}</a>
          @if (node.evolvesTo.length) {
            <app-evolution-tree [nodes]="node.evolvesTo" />
          }
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 0;
      padding-left: var(--space-5);
    }
    :host(.root) > ul {
      padding-left: var(--space-4);
    }
  `,
})
export class EvolutionTree {
  readonly nodes = input.required<EvolutionNode[]>();
}
