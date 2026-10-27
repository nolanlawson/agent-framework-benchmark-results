import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IndexData, Loaded, NamedLabel } from '../models';
import { NotFoundPage } from '../shared/not-found';
import { syncTitle } from '../shared/page-title';
import { CardView, PokemonCards } from '../shared/pokemon-cards';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 150;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCards, NotFoundPage],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly router = inject(Router);

  readonly data = input.required<Loaded<IndexData>>();
  readonly q = input<string>();
  readonly type = input<string>();
  readonly generation = input<string>();
  readonly page = input<string>();

  protected readonly index = computed(() => {
    const data = this.data();
    return 'pokemon' in data ? data : null;
  });

  /** The search box's text; follows the URL but can run ahead of it while typing. */
  protected readonly searchText = linkedSignal(() => this.q() ?? '');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly typeLabels = computed(
    () => new Map((this.index()?.types ?? []).map((t): [string, NamedLabel] => [t.name, t])),
  );

  protected readonly matches = computed(() => {
    const index = this.index();
    if (!index) return [];
    const q = (this.q() ?? '').trim().toLowerCase();
    const type = this.type();
    const generation = this.generation();
    return index.pokemon.filter(
      (p) =>
        (!q || p.label.toLowerCase().includes(q)) &&
        (!type || p.types.includes(type)) &&
        (!generation || p.generation === generation),
    );
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matches().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => {
    const n = Number.parseInt(this.page() ?? '1', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), this.pageCount()) : 1;
  });

  protected readonly cards = computed<CardView[]>(() => {
    const labels = this.typeLabels();
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.matches()
      .slice(start, start + PAGE_SIZE)
      .map((p) => ({
        ...p,
        types: p.types.map((t) => labels.get(t) ?? { name: t, label: t }),
      }));
  });

  constructor() {
    syncTitle(() => (this.index() ? '' : null));
  }

  protected pageParams(page: number) {
    return { page: page > 1 ? page : null };
  }

  protected onSearch(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.updateFilters({ q: value.trim() || null }, true), SEARCH_DEBOUNCE_MS);
  }

  protected onSelect(name: 'type' | 'generation', value: string): void {
    this.updateFilters({ [name]: value || null }, false);
  }

  private updateFilters(params: Record<string, string | null>, replaceUrl: boolean): void {
    this.router.navigate([], {
      queryParams: { ...params, page: null },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
