import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PokemonCard } from '../data/models';
import { dexNumber } from './format';
import { TypeBadge } from './type-badge';

/** A grid of Pokémon cards, ordered as given. */
@Component({
  selector: 'app-pokemon-cards',
  imports: [NgOptimizedImage, RouterLink, TypeBadge],
  template: `
    <ul class="cards">
      @for (card of cards(); track card.id) {
        <li>
          <a class="card" [routerLink]="['/pokemon', card.name]">
            <img
              class="card__sprite"
              [ngSrc]="card.sprite"
              width="96"
              height="96"
              alt=""
              [priority]="$index < priorityCount()"
              (error)="hideImage($event)"
            />
            <span class="card__dex">{{ dex(card.id) }}</span>
            <span class="card__name">{{ card.label }}</span>
            @if (card.types?.length) {
              <span class="card__types">
                @for (type of card.types; track type.name) {
                  <app-type-badge [type]="type" plain />
                }
              </span>
            }
            @if (card.hiddenAbility) {
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
  readonly cards = input.required<PokemonCard[]>();
  /** How many leading sprites to load eagerly (the ones likely above the fold). */
  readonly priorityCount = input(0);

  protected readonly dex = dexNumber;

  protected hideImage(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
