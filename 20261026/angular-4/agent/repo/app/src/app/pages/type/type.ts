import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTitle } from '../../core/page-title';
import { NotFound } from '../../shared/not-found';
import { PokemonCardList } from '../../shared/pokemon-card-list';
import { TypeBadge } from '../../shared/type-badge';
import { TypePageData } from './type-data';

@Component({
  selector: 'app-type',
  imports: [RouterLink, NotFound, PokemonCardList, TypeBadge],
  template: `
    @if (data(); as type) {
      <h1>{{ type.label }}</h1>

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (relation of type.relations; track relation.term) {
            <div>
              <dt>{{ relation.term }}</dt>
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
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ type.pokemon.length }} Pokémon</p>
        <app-pokemon-card-list [cards]="type.pokemon" />
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ type.moves.length }} moves</p>
        <ul class="move-columns" role="list">
          @for (move of type.moves; track move.name) {
            <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
          }
        </ul>
      </section>
    } @else {
      <app-not-found />
    }
  `,
  styles: `
    .relations {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      margin: 0;
    }

    .relations dt {
      margin-bottom: var(--space-1);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .relations dd {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin: 0;
    }

    .move-columns {
      margin-top: var(--space-4);
      column-width: 10rem;
      column-gap: var(--space-5);
      margin-bottom: 0;
      padding: 0;
      list-style: none;
      font-size: var(--text-sm);
    }

    .move-columns li {
      break-inside: avoid;
      padding-bottom: var(--space-2);
    }

    @media (max-width: 40rem) {
      .relations {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TypePage {
  private readonly title = inject(PageTitle);

  readonly data = input.required<TypePageData | null>();

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) this.title.set(data.label);
    });
  }
}
