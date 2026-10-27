import { Component, Injector, afterNextRender, computed, effect, inject, input, resource } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { dexNumber, humanize } from '../../core/format';
import { errorHeading, syncPageTitle } from '../../core/page-title';
import { PokeApi } from '../../core/poke-api';
import { LoadState } from '../../shared/load-state';
import { TypeBadge } from '../../shared/type-badge';
import { loadMoveTables } from './moves-data';
import { MovesTable } from './moves-table';
import { loadPokemonView } from './pokemon-data';

/** Base stats are drawn against the highest possible base stat. */
const MAX_STAT = 255;

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, LoadState, TypeBadge, MovesTable],
  templateUrl: './pokemon-page.html',
})
export class PokemonPage {
  readonly name = input.required<string>();
  /** Version group whose moves are shown (query parameter). */
  readonly game = input<string>();

  private readonly api = inject(PokeApi);
  private readonly router = inject(Router);

  protected readonly data = resource({
    params: () => this.name(),
    loader: ({ params }) => loadPokemonView(this.api, params),
  });

  protected readonly selectedGame = computed(() => {
    if (!this.data.hasValue()) return null;
    const games = this.data.value().games;
    return games.find((g) => g.name === this.game()) ?? games[games.length - 1] ?? null;
  });

  protected readonly moves = resource({
    params: () => {
      const game = this.selectedGame();
      return this.data.hasValue() && game ? { pokemon: this.data.value().pokemon, game: game.name } : undefined;
    },
    loader: ({ params }) => loadMoveTables(this.api, params.pokemon, params.game),
  });

  protected readonly dexNumber = dexNumber;
  protected readonly humanize = humanize;
  protected readonly maxStat = MAX_STAT;

  constructor() {
    syncPageTitle(() => {
      if (this.data.error()) return errorHeading(this.data.error());
      return this.data.hasValue() ? this.data.value().name : null;
    });

    // Sections render once their data arrives, so jump to the fragment (#moves) only after
    // the moves are in; until then the page may be too short to scroll that far.
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    const injector = inject(Injector);
    let jumped = false;
    effect(() => {
      if (jumped || !this.data.hasValue() || this.moves.isLoading()) return;
      jumped = true;
      if (fragment) afterNextRender(() => document.getElementById(fragment)?.scrollIntoView(), { injector });
    });
  }

  protected selectGame(event: Event) {
    const game = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], { queryParams: { game }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected statWidth(value: number, max = MAX_STAT): string {
    return `${Math.min(100, (value / max) * 100)}%`;
  }
}
