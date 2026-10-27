import { Component, effect, inject, input } from '@angular/core';
import { MISSING } from '../../core/format';
import { PageTitle } from '../../core/page-title';
import { NotFound } from '../../shared/not-found';
import { PokemonCardList } from '../../shared/pokemon-card-list';
import { AbilityPageData } from './ability-data';

@Component({
  selector: 'app-ability',
  imports: [NotFound, PokemonCardList],
  template: `
    @if (data(); as ability) {
      <h1>{{ ability.label }}</h1>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ ability.effect ?? missing }}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ ability.pokemon.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="ability.pokemon" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
})
export class AbilityPage {
  private readonly title = inject(PageTitle);

  readonly data = input.required<AbilityPageData | null>();

  protected readonly missing = MISSING;

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) this.title.set(data.label);
    });
  }
}
