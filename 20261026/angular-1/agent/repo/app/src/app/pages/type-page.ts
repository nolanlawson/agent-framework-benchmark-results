import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { englishName, humanize } from '../core/format';
import { DamageRelation } from '../core/models';
import { errorHeading, syncPageTitle } from '../core/page-title';
import { PokeApi } from '../core/poke-api';
import { LoadState } from '../shared/load-state';
import { PokemonCardList } from '../shared/pokemon-card-list';
import { TypeBadge } from '../shared/type-badge';

const RELATIONS: { key: DamageRelation; label: string }[] = [
  { key: 'double_damage_to', label: 'Super effective against' },
  { key: 'half_damage_to', label: 'Not very effective against' },
  { key: 'no_damage_to', label: 'No effect against' },
  { key: 'double_damage_from', label: 'Weak to' },
  { key: 'half_damage_from', label: 'Resists' },
  { key: 'no_damage_from', label: 'Immune to' },
];

async function loadType(api: PokeApi, name: string) {
  const type = await api.type(name);
  const [relations, pokemon] = await Promise.all([
    Promise.all(
      RELATIONS.map(async ({ key, label }) => ({ label, types: await api.typeLabels(type.damage_relations[key]) })),
    ),
    api.cardsFor(type.pokemon),
  ]);
  return {
    name: englishName(type.names, type.name),
    relations,
    pokemon,
    moves: type.moves.map((m) => ({ name: m.name, label: humanize(m.name) })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, LoadState, PokemonCardList, TypeBadge],
  template: `
    @if (data.hasValue()) {
      @let type = data.value();
      <h1>{{ type.name }}</h1>

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of type.relations; track relation.label) {
            <div>
              <dt>{{ relation.label }}</dt>
              <dd>
                @for (related of relation.types; track related.name) {
                  <app-type-badge [name]="related.name" [label]="related.label" />
                } @empty {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ type.pokemon.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="type.pokemon" />
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ type.moves.length }} moves</p>
        <ul class="move-columns">
          @for (move of type.moves; track move.name) {
            <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
          }
        </ul>
      </section>
    } @else {
      <app-load-state [error]="data.error()" />
    }
  `,
})
export class TypePage {
  readonly name = input.required<string>();
  private readonly api = inject(PokeApi);

  protected readonly data = resource({
    params: () => this.name(),
    loader: ({ params }) => loadType(this.api, params),
  });

  constructor() {
    syncPageTitle(() => (this.data.error() ? errorHeading(this.data.error()) : this.data.value()?.name));
  }
}
