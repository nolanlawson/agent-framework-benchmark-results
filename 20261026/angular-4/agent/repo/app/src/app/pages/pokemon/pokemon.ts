import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { PageTitle } from '../../core/page-title';
import { NotFound } from '../../shared/not-found';
import { TypeBadge } from '../../shared/type-badge';
import { MoveTableView } from './move-table';
import { PokemonPageData } from './pokemon-data';

/** Highest possible base stat, used to scale the bars. */
const MAX_STAT = 255;

@Component({
  selector: 'app-pokemon',
  imports: [RouterLink, NgOptimizedImage, NgTemplateOutlet, NotFound, TypeBadge, MoveTableView],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.css',
})
export class PokemonPage {
  private readonly router = inject(Router);
  private readonly title = inject(PageTitle);

  readonly data = input.required<PokemonPageData | null>();

  protected readonly total = computed(() =>
    (this.data()?.summary.stats ?? []).reduce((sum, s) => sum + s.value, 0),
  );
  protected readonly totalMax = computed(() => MAX_STAT * (this.data()?.summary.stats.length || 1));

  constructor() {
    effect(() => {
      const data = this.data();
      if (data) this.title.set(data.summary.label);
    });
  }

  protected barWidth(value: number, max = MAX_STAT): string {
    return `${Math.min(100, (value / max) * 100)}%`;
  }

  protected onGameChange(event: Event) {
    const game = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], { queryParams: { game }, fragment: 'moves' });
  }
}
