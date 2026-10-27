import { HttpClient, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ResolveFn } from '@angular/router';
import { catchError, from, map, Observable, of, shareReplay } from 'rxjs';
import {
  AbilityData,
  IndexData,
  Loaded,
  MoveData,
  NotFound,
  PokemonData,
  TypeData,
  TypeListData,
} from './models';

/** Server-only: answers `/data/*` requests in-process during server-side rendering. */
export const DATA_HANDLER = new InjectionToken<(url: string) => Promise<unknown>>('DATA_HANDLER');

export const dataInterceptor: HttpInterceptorFn = (req, next) => {
  const handler = inject(DATA_HANDLER, { optional: true });
  if (!handler) return next(req);
  const url = new URL(req.urlWithParams, 'http://localhost');
  if (!url.pathname.startsWith('/data/')) return next(req);
  return from(handler(url.pathname + url.search)).pipe(
    map((body) => new HttpResponse({ status: 200, body, url: req.urlWithParams })),
  );
};

const CLIENT_CACHE_TTL_MS = 60_000;
const NOT_FOUND: NotFound = { notFound: true };

/** Loads view models from the app server, caching them briefly in the browser. */
@Injectable({ providedIn: 'root' })
export class PokedexData {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cache = new Map<string, { expires: number; value: Observable<unknown> }>();

  private get<T>(path: string, params: Record<string, string | null | undefined> = {}): Observable<Loaded<T>> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
    const url = `/data/${path}${query.size ? `?${query}` : ''}`;
    const hit = this.cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.value as Observable<Loaded<T>>;
    const value = this.http.get<Loaded<T>>(url).pipe(
      catchError(() => {
        this.cache.delete(url);
        return of(NOT_FOUND);
      }),
      shareReplay(1),
    );
    if (this.isBrowser) this.cache.set(url, { expires: Date.now() + CLIENT_CACHE_TTL_MS, value });
    return value;
  }

  index() {
    return this.get<IndexData>('index');
  }
  pokemon(name: string, game: string | null) {
    return this.get<PokemonData>(`pokemon/${encodeURIComponent(name)}`, { game });
  }
  move(name: string) {
    return this.get<MoveData>(`moves/${encodeURIComponent(name)}`);
  }
  ability(name: string) {
    return this.get<AbilityData>(`abilities/${encodeURIComponent(name)}`);
  }
  typeList() {
    return this.get<TypeListData>('types');
  }
  type(name: string) {
    return this.get<TypeData>(`types/${encodeURIComponent(name)}`);
  }
}

export const indexResolver: ResolveFn<Loaded<IndexData>> = () => inject(PokedexData).index();
export const pokemonResolver: ResolveFn<Loaded<PokemonData>> = (route) =>
  inject(PokedexData).pokemon(route.paramMap.get('name')!, route.queryParamMap.get('game'));
export const moveResolver: ResolveFn<Loaded<MoveData>> = (route) =>
  inject(PokedexData).move(route.paramMap.get('name')!);
export const abilityResolver: ResolveFn<Loaded<AbilityData>> = (route) =>
  inject(PokedexData).ability(route.paramMap.get('name')!);
export const typeListResolver: ResolveFn<Loaded<TypeListData>> = () => inject(PokedexData).typeList();
export const typeResolver: ResolveFn<Loaded<TypeData>> = (route) =>
  inject(PokedexData).type(route.paramMap.get('name')!);
