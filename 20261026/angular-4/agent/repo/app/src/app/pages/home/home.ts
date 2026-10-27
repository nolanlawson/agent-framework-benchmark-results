import { Component, computed, inject, input, linkedSignal, OnDestroy } from '@angular/core';
import { Params, Router, RouterLink } from '@angular/router';
import { Catalog } from '../../core/catalog';
import { PageTitle } from '../../core/page-title';
import { PokemonCardData } from '../../core/models';
import { PokemonCardList } from '../../shared/pokemon-card-list';
import { HomeData } from './home-data';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

interface Filters {
  q: string;
  type: string;
  generation: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, PokemonCardList],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly catalog = inject(Catalog);

  readonly data = input.required<HomeData>();
  // Filter state lives in the URL query; the router binds these from query params.
  readonly q = input<string>();
  readonly type = input<string>();
  readonly generation = input<string>();
  readonly page = input<string>();

  private readonly filters = computed<Filters>(() => ({
    q: this.q() ?? '',
    type: this.type() ?? '',
    generation: this.generation() ?? '',
  }));

  /** The last search the user submitted to the URL, so typing isn't overwritten by a lagging URL. */
  private submittedSearch = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly searchText = linkedSignal<string, string>({
    source: () => this.q() ?? '',
    computation: (q, previous) =>
      previous && q === this.submittedSearch ? previous.value : q,
  });

  protected readonly matches = computed(() => {
    const { q, type, generation } = this.filters();
    const needle = q.trim().toLowerCase();
    return this.data().entries.filter(
      (e) =>
        (!needle || e.label.toLowerCase().includes(needle)) &&
        (!type || e.types.includes(type)) &&
        (!generation || e.generation === generation),
    );
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.matches().length / PAGE_SIZE)));

  protected readonly currentPage = computed(() => {
    const page = Number.parseInt(this.page() ?? '1', 10);
    return Number.isFinite(page) ? Math.min(Math.max(page, 1), this.totalPages()) : 1;
  });

  protected readonly cards = computed<PokemonCardData[]>(() => {
    const typeLabels = new Map(this.data().types.map((t) => [t.name, t]));
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.matches()
      .slice(start, start + PAGE_SIZE)
      .map((e) =>
        this.catalog.card(e.id, e.name, {
          types: e.types.map((t) => typeLabels.get(t) ?? { name: t, label: t }),
        }),
      );
  });

  protected readonly previousPageParams = computed(() => this.queryParams(this.filters(), this.currentPage() - 1));
  protected readonly nextPageParams = computed(() => this.queryParams(this.filters(), this.currentPage() + 1));

  constructor() {
    inject(PageTitle).set(null);
  }

  ngOnDestroy() {
    clearTimeout(this.searchTimer);
  }

  protected onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters({ q: value }, true), SEARCH_DEBOUNCE_MS);
  }

  protected onTypeChange(event: Event) {
    this.applyFilters({ type: (event.target as HTMLSelectElement).value });
  }

  protected onGenerationChange(event: Event) {
    this.applyFilters({ generation: (event.target as HTMLSelectElement).value });
  }

  /** Changing a filter goes back to page 1. */
  private applyFilters(change: Partial<Filters>, replaceUrl = false) {
    const filters = { ...this.filters(), q: this.searchText(), ...change };
    this.submittedSearch = filters.q;
    void this.router.navigate(['/'], { queryParams: this.queryParams(filters, 1), replaceUrl });
  }

  /** Query params for a view, leaving out empty and default values. */
  private queryParams({ q, type, generation }: Filters, page: number): Params {
    const params: Params = {};
    if (q) params['q'] = q;
    if (type) params['type'] = type;
    if (generation) params['generation'] = generation;
    if (page > 1) params['page'] = page;
    return params;
  }
}
