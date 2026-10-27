import { Routes } from '@angular/router';
import {
  abilityResolver,
  indexResolver,
  moveResolver,
  pokemonResolver,
  typeListResolver,
  typeResolver,
} from './data';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    resolve: { data: indexResolver },
    loadComponent: () => import('./pages/home-page').then((m) => m.HomePage),
  },
  {
    path: 'pokemon/:name',
    resolve: { data: pokemonResolver },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    loadComponent: () => import('./pages/pokemon-page').then((m) => m.PokemonPage),
  },
  {
    path: 'moves/:name',
    resolve: { data: moveResolver },
    loadComponent: () => import('./pages/move-page').then((m) => m.MovePage),
  },
  {
    path: 'abilities/:name',
    resolve: { data: abilityResolver },
    loadComponent: () => import('./pages/ability-page').then((m) => m.AbilityPage),
  },
  {
    path: 'types',
    pathMatch: 'full',
    resolve: { data: typeListResolver },
    loadComponent: () => import('./pages/type-list-page').then((m) => m.TypeListPage),
  },
  {
    path: 'types/:name',
    resolve: { data: typeResolver },
    loadComponent: () => import('./pages/type-page').then((m) => m.TypePage),
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found').then((m) => m.NotFoundPage),
  },
];
