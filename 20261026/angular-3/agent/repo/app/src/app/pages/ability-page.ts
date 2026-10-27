import { Component, computed, input } from '@angular/core';
import { AbilityData, Loaded } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';
import { PokemonCards } from '../shared/pokemon-cards';

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCards, NotFoundPage],
  template: `
    @if (ability(); as a) {
      <h1>{{ a.label }}</h1>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p class="text">{{ a.effect ?? '—' }}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ a.pokemon.length }} Pokémon</p>
        <app-pokemon-cards [cards]="a.pokemon" [spriteBase]="a.spriteBase" />
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .text {
      margin: 0;
    }
  `,
})
export class AbilityPage {
  readonly data = input.required<Loaded<AbilityData>>();
  protected readonly ability = computed(() => {
    const data = this.data();
    return 'pokemon' in data ? data : null;
  });

  constructor() {
    syncTitle(() => this.ability()?.label ?? null);
  }
}
