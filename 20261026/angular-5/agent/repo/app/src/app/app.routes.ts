import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Routes } from '@angular/router';
import type {
  AbilityDetail,
  MoveDetail,
  NamedRef,
  PokemonDetail,
  PokemonListPage,
  TypeDetail,
} from './data/models';
import { DataParams, PokedexData } from './data/pokedex-data';

/** Resolves the data at `<resource>/<:name param>`, with the given query params. */
function resolveData<T>(resource: string, queryParams: string[] = []): ResolveFn<T | null> {
  return (route: ActivatedRouteSnapshot) => {
    const name = route.paramMap.get('name');
    const path = name === null ? resource : `${resource}/${encodeURIComponent(name)}`;
    const params: DataParams = {};
    for (const p of queryParams) params[p] = route.queryParamMap.get(p);
    return inject(PokedexData).load<T>(path, params);
  };
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page'),
    resolve: { list: resolveData<PokemonListPage>('pokemon-list', ['q', 'type', 'generation', 'page']) },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pages/pokemon/pokemon-page'),
    resolve: { pokemon: resolveData<PokemonDetail>('pokemon', ['game']) },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./pages/move/move-page'),
    resolve: { move: resolveData<MoveDetail>('moves') },
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./pages/ability/ability-page'),
    resolve: { ability: resolveData<AbilityDetail>('abilities') },
  },
  {
    path: 'types',
    loadComponent: () => import('./pages/types/types-page'),
    resolve: { types: resolveData<NamedRef[]>('types') },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type/type-page'),
    resolve: { type: resolveData<TypeDetail>('types') },
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found-page'),
  },
];
