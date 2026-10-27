import { Component, input } from '@angular/core';
import type { AbilityDetail } from '../../data/models';
import { orMissing } from '../../shared/format';
import { NotFound } from '../../shared/not-found';
import { syncPageTitle } from '../../shared/page-title';
import { PokemonCards } from '../../shared/pokemon-cards';
import { Section } from '../../shared/section';

@Component({
  selector: 'app-ability-page',
  imports: [NotFound, PokemonCards, Section],
  template: `
    @if (ability(); as a) {
      <h1>{{ a.label }}</h1>
      <app-section heading="Effect">
        <p class="effect">{{ orMissing(a.effect) }}</p>
      </app-section>
      <app-section heading="Pokémon">
        <p class="count">{{ a.pokemon.length }} Pokémon</p>
        <app-pokemon-cards [cards]="a.pokemon" />
      </app-section>
    } @else {
      <app-not-found />
    }
  `,
  styleUrl: '../detail-page.css',
})
export default class AbilityPage {
  readonly ability = input.required<AbilityDetail | null>();

  protected readonly orMissing = orMissing;

  constructor() {
    syncPageTitle(() => this.ability()?.label ?? 'Not found');
  }
}
