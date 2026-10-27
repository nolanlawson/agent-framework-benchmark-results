import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { PokemonDetail } from '../../data/models';
import { dexNumber, orMissing } from '../../shared/format';
import { NotFound } from '../../shared/not-found';
import { syncPageTitle } from '../../shared/page-title';
import { Section } from '../../shared/section';
import { TypeBadge } from '../../shared/type-badge';
import { EvolutionTree } from './evolution-tree';
import { MovesTable } from './moves-table';

/** Stat bars are scaled to the highest possible base stat. */
const MAX_STAT = 255;

@Component({
  selector: 'app-pokemon-page',
  imports: [DecimalPipe, NgOptimizedImage, RouterLink, NotFound, Section, TypeBadge, EvolutionTree, MovesTable],
  templateUrl: './pokemon-page.html',
  styleUrl: './pokemon-page.css',
})
export default class PokemonPage {
  private readonly router = inject(Router);

  readonly pokemon = input.required<PokemonDetail | null>();

  protected readonly dex = dexNumber;
  protected readonly orMissing = orMissing;

  protected readonly stats = computed(() => {
    const stats = this.pokemon()?.stats ?? [];
    const rows = stats.map((s) => ({ ...s, percent: (100 * s.value) / MAX_STAT }));
    const total = stats.reduce((sum, s) => sum + s.value, 0);
    return {
      rows,
      total: { label: 'Total', value: total, percent: (100 * total) / (MAX_STAT * Math.max(1, stats.length)) },
    };
  });

  constructor() {
    syncPageTitle(() => this.pokemon()?.label ?? 'Not found');
  }

  protected selectGame(game: string): void {
    this.router.navigate([], {
      queryParams: { game },
      queryParamsHandling: 'merge',
      scroll: 'manual',
    });
  }
}
