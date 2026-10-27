import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TypeDetail } from '../../data/models';
import { NotFound } from '../../shared/not-found';
import { syncPageTitle } from '../../shared/page-title';
import { PokemonCards } from '../../shared/pokemon-cards';
import { Section } from '../../shared/section';
import { TypeBadge } from '../../shared/type-badge';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, NotFound, PokemonCards, Section, TypeBadge],
  template: `
    @if (type(); as t) {
      <h1>{{ t.label }}</h1>
      <app-section heading="Damage relations">
        <dl class="relations">
          @for (relation of t.relations; track relation.label) {
            <div>
              <dt>{{ relation.label }}</dt>
              <dd>
                @for (related of relation.types; track related.name) {
                  <app-type-badge [type]="related" />
                } @empty {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </app-section>
      <app-section heading="Pokémon">
        <p class="count">{{ t.pokemon.length }} Pokémon</p>
        <app-pokemon-cards [cards]="t.pokemon" />
      </app-section>
      <app-section heading="Moves">
        <p class="count">{{ t.moves.length }} moves</p>
        <ul class="moves">
          @for (move of t.moves; track move.name) {
            <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
          }
        </ul>
      </app-section>
    } @else {
      <app-not-found />
    }
  `,
  styleUrl: '../detail-page.css',
})
export default class TypePage {
  readonly type = input.required<TypeDetail | null>();

  constructor() {
    syncPageTitle(() => this.type()?.label ?? 'Not found');
  }
}
