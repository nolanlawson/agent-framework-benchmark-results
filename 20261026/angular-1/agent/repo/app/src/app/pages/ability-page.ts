import { Component, inject, input, resource } from '@angular/core';
import { englishName, latestEnglishFlavorText, MISSING } from '../core/format';
import { errorHeading, syncPageTitle } from '../core/page-title';
import { PokeApi } from '../core/poke-api';
import { LoadState } from '../shared/load-state';
import { PokemonCardList } from '../shared/pokemon-card-list';

async function loadAbility(api: PokeApi, name: string) {
  const ability = await api.ability(name);
  const shortEffect = ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect;
  return {
    name: englishName(ability.names, ability.name),
    effect: shortEffect || latestEnglishFlavorText(ability.flavor_text_entries) || MISSING,
    pokemon: await api.cardsFor(ability.pokemon, (entry) => ({ hiddenAbility: entry.is_hidden })),
  };
}

@Component({
  selector: 'app-ability-page',
  imports: [LoadState, PokemonCardList],
  template: `
    @if (data.hasValue()) {
      @let ability = data.value();
      <h1>{{ ability.name }}</h1>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ ability.effect }}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ ability.pokemon.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="ability.pokemon" />
      </section>
    } @else {
      <app-load-state [error]="data.error()" />
    }
  `,
})
export class AbilityPage {
  readonly name = input.required<string>();
  private readonly api = inject(PokeApi);

  protected readonly data = resource({
    params: () => this.name(),
    loader: ({ params }) => loadAbility(this.api, params),
  });

  constructor() {
    syncPageTitle(() => (this.data.error() ? errorHeading(this.data.error()) : this.data.value()?.name));
  }
}
