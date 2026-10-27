import { Component, computed, inject, input, linkedSignal, OnDestroy } from '@angular/core';
import { Params, Router, RouterLink } from '@angular/router';
import type { PokemonListPage } from '../../data/models';
import { syncPageTitle } from '../../shared/page-title';
import { PokemonCards } from '../../shared/pokemon-cards';

const SEARCH_DEBOUNCE_MS = 150;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCards],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export default class HomePage implements OnDestroy {
  private readonly router = inject(Router);

  readonly list = input.required<PokemonListPage>();
  // Query params, bound by the router.
  readonly q = input<string>();
  readonly type = input<string>();
  readonly generation = input<string>();

  /** What's in the search box; can run ahead of the URL while the user types. */
  protected readonly search = linkedSignal(() => this.q() ?? '');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly pageLinkParams = computed(() => {
    const { page, totalPages } = this.list();
    return {
      previous: page > 1 ? this.filterParams({ page: page - 1 }) : null,
      next: page < totalPages ? this.filterParams({ page: page + 1 }) : null,
    };
  });

  constructor() {
    syncPageTitle(() => null);
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters({ q: value }), SEARCH_DEBOUNCE_MS);
  }

  protected applyFilters(changes: { q?: string; type?: string; generation?: string }): void {
    clearTimeout(this.searchTimer);
    this.router.navigate(['/'], {
      queryParams: this.filterParams({ q: this.search(), ...changes, page: 1 }),
      replaceUrl: 'q' in changes,
      scroll: 'manual',
    });
  }

  /** Query params for the current filters with `overrides`, leaving out defaults. */
  private filterParams(overrides: { q?: string; type?: string; generation?: string; page?: number }): Params {
    const values = { q: this.q(), type: this.type(), generation: this.generation(), ...overrides };
    const params: Params = {};
    const q = values.q?.trim();
    if (q) params['q'] = q;
    if (values.type) params['type'] = values.type;
    if (values.generation) params['generation'] = values.generation;
    if (values.page && values.page > 1) params['page'] = values.page;
    return params;
  }
}
