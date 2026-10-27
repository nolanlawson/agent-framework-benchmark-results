import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Loaded, TypeData } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';
import { PokemonCards } from '../shared/pokemon-cards';
import { TypeBadge } from '../shared/type-badge';

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCards, TypeBadge, NotFoundPage],
  template: `
    @if (type(); as t) {
      <h1>{{ t.label }}</h1>

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          @for (r of t.relations; track r.label) {
            <div>
              <dt>{{ r.label }}</dt>
              <dd>
                @if (r.types.length) {
                  <span class="type-badges">
                    @for (rt of r.types; track rt.name) {
                      <app-type-badge [type]="rt" />
                    }
                  </span>
                } @else {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ t.pokemon.length }} Pokémon</p>
        <app-pokemon-cards [cards]="t.pokemon" [spriteBase]="t.spriteBase" />
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{{ t.moves.length }} moves</p>
        <ul class="moves">
          @for (m of t.moves; track m.name) {
            <li><a [routerLink]="['/moves', m.name]">{{ m.label }}</a></li>
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4) var(--space-5);
      margin: 0;
    }
    dt {
      margin-bottom: var(--space-1);
      color: var(--color-text-muted);
      font-size: var(--text-xs);
    }
    @media (max-width: 40rem) {
      .relations {
        grid-template-columns: 1fr;
      }
    }
    dd {
      margin: 0;
      font-size: var(--text-sm);
    }
    .moves {
      columns: 6 9rem;
      column-gap: var(--space-5);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--text-xs);
      line-height: 2;
    }
  `,
})
export class TypePage {
  readonly data = input.required<Loaded<TypeData>>();
  protected readonly type = computed(() => {
    const data = this.data();
    return 'relations' in data ? data : null;
  });

  constructor() {
    syncTitle(() => this.type()?.label ?? null);
  }
}
