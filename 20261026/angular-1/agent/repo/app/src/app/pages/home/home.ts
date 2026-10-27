import { Component, DestroyRef, computed, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { Params, Router, RouterLink } from '@angular/router';
import { CardData, PokeApi } from '../../core/poke-api';
import { syncPageTitle } from '../../core/page-title';
import { PokemonCardList } from '../../shared/pokemon-card-list';
import { Filters, filterSpecies, loadHomeData } from './home-data';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

@Component({
  selector: 'app-home',
  imports: [RouterLink, PokemonCardList],
  templateUrl: './home.html',
})
export class Home {
  // Query parameters, bound by the router.
  readonly q = input<string>();
  readonly type = input<string>();
  readonly generation = input<string>();
  readonly page = input<string>();

  private readonly api = inject(PokeApi);
  private readonly router = inject(Router);

  protected readonly data = resource({ loader: () => loadHomeData(this.api) });

  protected readonly filters = computed<Filters>(() => ({
    q: this.q() ?? '',
    type: this.type() ?? '',
    generation: this.generation() ?? '',
  }));

  protected readonly matches = computed(() => (this.data.hasValue() ? filterSpecies(this.data.value(), this.filters()) : []));
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matches().length / PAGE_SIZE)));
  protected readonly currentPage = computed(() => {
    const requested = Number.parseInt(this.page() ?? '1', 10);
    return Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), this.pageCount());
  });

  protected readonly cards = computed<CardData[]>(() => {
    if (!this.data.hasValue()) return [];
    const { typesBySpecies } = this.data.value();
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.matches()
      .slice(start, start + PAGE_SIZE)
      .map((s) => ({ ...s, types: typesBySpecies.get(s.id) ?? [] }));
  });

  /** What's in the search box. The URL's `q` follows it after a short debounce. */
  protected readonly searchText = signal('');
  private lastSearchSent: string | undefined;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    syncPageTitle(() => null);

    // Take the search text from the URL, unless the URL is just catching up with typing.
    effect(() => {
      const q = this.q() ?? '';
      if (q !== this.lastSearchSent) this.searchText.set(q);
    });

    // Moving between pages starts at the top of the new page.
    let previousPage: number | undefined;
    effect(() => {
      const page = this.currentPage();
      if (previousPage !== undefined && page !== previousPage) window.scrollTo(0, 0);
      previousPage = page;
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected onSearch(value: string) {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.lastSearchSent = value;
      this.applyFilters({ q: value }, true);
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onSelect(key: 'type' | 'generation', event: Event) {
    this.applyFilters({ [key]: (event.target as HTMLSelectElement).value }, false);
  }

  /** Query parameters for a view, leaving out empty and default values. */
  protected queryParams(filters: Filters, page = 1): Params {
    const params: Params = {};
    if (filters.q.trim()) params['q'] = filters.q;
    if (filters.type) params['type'] = filters.type;
    if (filters.generation) params['generation'] = filters.generation;
    if (page > 1) params['page'] = page;
    return params;
  }

  /** Changing a filter goes back to the first page. */
  private applyFilters(change: Partial<Filters>, replaceUrl: boolean) {
    const filters = { ...untracked(this.filters), q: this.searchText(), ...change };
    void this.router.navigate(['/'], { queryParams: this.queryParams(filters), replaceUrl });
  }
}
