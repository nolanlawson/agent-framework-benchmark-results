import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardData, NamedLabel } from '../models';
import { TypeBadge } from './type-badge';

export interface CardView extends CardData {
  types?: NamedLabel[];
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** A grid of Pokémon cards, each linking to the species page. */
@Component({
  selector: 'app-pokemon-cards',
  imports: [RouterLink, TypeBadge],
  template: `
    <ul class="cards">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img
              class="card__sprite"
              [src]="spriteBase() + card.id + '.png'"
              alt=""
              width="96"
              height="96"
              loading="lazy"
              decoding="async"
            />
            <span class="card__dex">{{ dex(card.id) }}</span>
            <span class="card__name">{{ card.label }}</span>
            @if (card.types?.length) {
              <span class="type-badges card__types">
                @for (type of card.types; track type.name) {
                  <app-type-badge [type]="type" [link]="false" />
                }
              </span>
            }
            @if (card.hidden) {
              <span class="card__note">Hidden ability</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './pokemon-cards.css',
})
export class PokemonCards {
  readonly cards = input.required<CardView[]>();
  readonly spriteBase = input.required<string>();
  protected readonly dex = dexNumber;
}
