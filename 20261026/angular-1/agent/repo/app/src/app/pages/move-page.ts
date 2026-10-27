import { Component, inject, input, resource } from '@angular/core';
import { englishName, humanize, latestEnglishFlavorText, MISSING, orMissing } from '../core/format';
import { errorHeading, syncPageTitle } from '../core/page-title';
import { PokeApi } from '../core/poke-api';
import { LoadState } from '../shared/load-state';
import { PokemonCardList } from '../shared/pokemon-card-list';
import { TypeBadge } from '../shared/type-badge';

async function loadMove(api: PokeApi, name: string) {
  const move = await api.move(name);
  const [[type], learnedBy] = await Promise.all([
    api.typeLabels([move.type]),
    api.cardsFor(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const shortEffect = move.effect_entries.find((e) => e.language.name === 'en')?.short_effect;
  return {
    name: englishName(move.names, move.name),
    type,
    category: move.damage_class ? humanize(move.damage_class.name) : MISSING,
    power: orMissing(move.power),
    accuracy: orMissing(move.accuracy),
    pp: orMissing(move.pp),
    effect: shortEffect || latestEnglishFlavorText(move.flavor_text_entries) || MISSING,
    learnedBy,
  };
}

@Component({
  selector: 'app-move-page',
  imports: [LoadState, PokemonCardList, TypeBadge],
  template: `
    @if (data.hasValue()) {
      @let move = data.value();
      <h1>{{ move.name }}</h1>
      <dl class="panel facts move-facts">
        <div>
          <dt>Type</dt>
          <dd><app-type-badge [name]="move.type.name" [label]="move.type.label" /></dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{{ move.category }}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{{ move.power }}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{{ move.accuracy }}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{{ move.pp }}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ move.effect }}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{{ move.learnedBy.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="move.learnedBy" />
      </section>
    } @else {
      <app-load-state [error]="data.error()" />
    }
  `,
})
export class MovePage {
  readonly name = input.required<string>();
  private readonly api = inject(PokeApi);

  protected readonly data = resource({
    params: () => this.name(),
    loader: ({ params }) => loadMove(this.api, params),
  });

  constructor() {
    syncPageTitle(() => (this.data.error() ? errorHeading(this.data.error()) : this.data.value()?.name));
  }
}
