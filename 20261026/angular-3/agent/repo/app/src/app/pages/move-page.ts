import { Component, computed, input } from '@angular/core';
import { Loaded, MoveData } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';
import { PokemonCards } from '../shared/pokemon-cards';
import { TypeBadge } from '../shared/type-badge';

@Component({
  selector: 'app-move-page',
  imports: [PokemonCards, TypeBadge, NotFoundPage],
  template: `
    @if (move(); as m) {
      <h1>{{ m.label }}</h1>
      <div class="panel details">
        <dl class="facts">
          <div>
            <dt>Type</dt>
            <dd><app-type-badge [type]="m.type" /></dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{{ m.category ?? '—' }}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{{ m.power ?? '—' }}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{{ m.accuracy ?? '—' }}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{{ m.pp ?? '—' }}</dd>
          </div>
        </dl>
      </div>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p class="text">{{ m.effect ?? '—' }}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{{ m.learnedBy.length }} Pokémon</p>
        <app-pokemon-cards [cards]="m.learnedBy" [spriteBase]="m.spriteBase" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .details {
      padding: var(--space-3) var(--space-4);
    }
    .text {
      margin: 0;
    }
  `,
})
export class MovePage {
  readonly data = input.required<Loaded<MoveData>>();
  protected readonly move = computed(() => {
    const data = this.data();
    return 'learnedBy' in data ? data : null;
  });

  constructor() {
    syncTitle(() => this.move()?.label ?? null);
  }
}
