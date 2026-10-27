import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dexNumber, humanize } from '../core/format';
import { CardData, PokeApi } from '../core/poke-api';
import { TypeBadge } from './type-badge';

/** A grid of Pokémon cards, each a link to the species page. */
@Component({
  selector: 'app-pokemon-card-list',
  imports: [RouterLink, TypeBadge],
  template: `
    <ul class="card-grid" role="list">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img
              class="card-sprite"
              [src]="api.spriteUrl(card.id)"
              alt=""
              width="96"
              height="96"
              loading="lazy"
              decoding="async"
              (error)="hide($event)"
            />
            <span class="card-number">{{ dexNumber(card.id) }}</span>
            <span class="card-name">{{ humanize(card.name) }}</span>
            @if (card.types?.length) {
              <span class="card-types">
                @for (type of card.types; track type.name) {
                  <app-type-badge [name]="type.name" [label]="type.label" static />
                }
              </span>
            }
            @if (card.hiddenAbility) {
              <span class="card-note">Hidden ability</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
})
export class PokemonCardList {
  readonly cards = input.required<CardData[]>();
  protected readonly api = inject(PokeApi);
  protected readonly dexNumber = dexNumber;
  protected readonly humanize = humanize;

  /** Not every species has a sprite; keep the card's layout without a broken-image icon. */
  protected hide(event: Event) {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
