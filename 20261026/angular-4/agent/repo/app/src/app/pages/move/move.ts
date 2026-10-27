import { Component, effect, inject, input } from '@angular/core';
import { MISSING } from '../../core/format';
import { PageTitle } from '../../core/page-title';
import { NotFound } from '../../shared/not-found';
import { PokemonCardList } from '../../shared/pokemon-card-list';
import { TypeBadge } from '../../shared/type-badge';
import { MovePageData } from './move-data';

@Component({
  selector: 'app-move',
  imports: [NotFound, PokemonCardList, TypeBadge],
  template: `
    @if (data(); as move) {
      <h1>{{ move.label }}</h1>
      <dl class="panel facts-panel">
        <div>
          <dt>Type</dt>
          <dd><app-type-badge [type]="move.type" /></dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ move.category ?? missing }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ move.power ?? missing }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ move.accuracy ?? missing }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ move.pp ?? missing }}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ move.effect ?? missing }}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{{ move.learnedBy.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="move.learnedBy" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export class MovePage {
  private readonly title = inject(PageTitle);

  readonly data = input.required<MovePageData | null>();

  protected readonly missing = MISSING;

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) this.title.set(data.label);
    });
  }
}
