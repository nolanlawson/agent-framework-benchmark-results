import { Component, input } from '@angular/core';
import type { MoveDetail } from '../../data/models';
import { orMissing } from '../../shared/format';
import { NotFound } from '../../shared/not-found';
import { syncPageTitle } from '../../shared/page-title';
import { PokemonCards } from '../../shared/pokemon-cards';
import { Section } from '../../shared/section';
import { TypeBadge } from '../../shared/type-badge';

@Component({
  selector: 'app-move-page',
  imports: [NotFound, PokemonCards, Section, TypeBadge],
  template: `
    @if (move(); as m) {
      <h1>{{ m.label }}</h1>
      <dl class="panel facts">
        <div>
          <dt>Type</dt>
          <dd><app-type-badge [type]="m.type" /></dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ orMissing(m.category) }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ orMissing(m.power) }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ orMissing(m.accuracy) }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ orMissing(m.pp) }}</dd>
        </div>
      </dl>
      <app-section heading="Effect">
        <p class="effect">{{ orMissing(m.effect) }}</p>
      </app-section>
      <app-section heading="Learned by">
        <p class="count">{{ m.learnedBy.length }} Pokémon</p>
        <app-pokemon-cards [cards]="m.learnedBy" />
      </app-section>
    } @else {
      <app-not-found />
    }
  `,
  styleUrl: '../detail-page.css',
})
export default class MovePage {
  readonly move = input.required<MoveDetail | null>();

  protected readonly orMissing = orMissing;

  constructor() {
    syncPageTitle(() => this.move()?.label ?? 'Not found');
  }
}
