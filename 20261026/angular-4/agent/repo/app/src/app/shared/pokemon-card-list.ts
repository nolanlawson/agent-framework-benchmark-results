import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { PokemonCardData } from '../core/models';
import { dexNumber } from '../core/format';
import { TypeBadge } from './type-badge';

/** A grid of Pokémon cards, one list item per card. */
@Component({
  selector: 'app-pokemon-card-list',
  imports: [RouterLink, NgOptimizedImage, TypeBadge],
  template: `
    <ul class="card-grid" role="list">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img
              class="card-sprite"
              [ngSrc]="card.sprite"
              width="96"
              height="96"
              alt=""
              (error)="hideBrokenImage($event)"
            />
            <span class="card-dex">{{ dex(card.id) }}</span>
            <span class="card-name">{{ card.label }}</span>
            @if (card.types?.length) {
              <span class="type-list">
                @for (type of card.types; track type.name) {
                  <app-type-badge [type]="type" [link]="false" />
                }
              </span>
            }
            @if (card.note) {
              <span class="card-note">{{ card.note }}</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
})
export class PokemonCardList {
  readonly cards = input.required<readonly PokemonCardData[]>();

  protected readonly dex = dexNumber;

  /** Not every Pokémon has a sprite; keep the card's layout but drop the broken-image icon. */
  protected hideBrokenImage(event: Event) {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
