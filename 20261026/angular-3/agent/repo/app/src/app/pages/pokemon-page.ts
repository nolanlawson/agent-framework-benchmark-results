import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Loaded, PokemonData } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';
import { dexNumber } from '../shared/pokemon-cards';
import { TypeBadge } from '../shared/type-badge';
import { MoveTable } from './move-table';

const MAX_STAT = 255;

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgTemplateOutlet, TypeBadge, MoveTable, NotFoundPage],
  templateUrl: './pokemon-page.html',
  styleUrl: './pokemon-page.css',
})
export class PokemonPage {
  private readonly router = inject(Router);

  readonly data = input.required<Loaded<PokemonData>>();

  protected readonly pokemon = computed(() => {
    const data = this.data();
    return 'id' in data ? data : null;
  });

  protected readonly total = computed(() => (this.pokemon()?.stats ?? []).reduce((sum, s) => sum + s.value, 0));

  constructor() {
    syncTitle(() => this.pokemon()?.label ?? null);
  }

  protected dex = dexNumber;

  protected barWidth(value: number, max = MAX_STAT): string {
    return `${Math.min(100, (value / max) * 100).toFixed(1)}%`;
  }

  protected totalMax(): number {
    return MAX_STAT * (this.pokemon()?.stats.length || 6);
  }

  protected onGameChange(game: string): void {
    this.router.navigate([], { queryParams: { game }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
