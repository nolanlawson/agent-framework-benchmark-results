import { Routes } from '@angular/router';
import { homeResolver } from './pages/home/home-data';
import { pokemonResolver } from './pages/pokemon/pokemon-data';
import { moveResolver } from './pages/move/move-data';
import { abilityResolver } from './pages/ability/ability-data';
import { typesResolver } from './pages/types/types-data';
import { typeResolver } from './pages/type/type-data';
import { isLoadErrorNavigation } from './shared/load-error';

export const routes: Routes = [
  {
    path: '**',
    canMatch: [isLoadErrorNavigation],
    loadComponent: () => import('./shared/load-error').then((m) => m.LoadError),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
    resolve: { data: homeResolver },
  },
  {
    path: 'pokemon/:name',
    loadComponent: () => import('./pages/pokemon/pokemon').then((m) => m.PokemonPage),
    resolve: { data: pokemonResolver },
    // The selected game (`?game=`) decides which moves to load.
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
  },
  {
    path: 'moves/:name',
    loadComponent: () => import('./pages/move/move').then((m) => m.MovePage),
    resolve: { data: moveResolver },
  },
  {
    path: 'abilities/:name',
    loadComponent: () => import('./pages/ability/ability').then((m) => m.AbilityPage),
    resolve: { data: abilityResolver },
  },
  {
    path: 'types',
    loadComponent: () => import('./pages/types/types').then((m) => m.TypesPage),
    resolve: { data: typesResolver },
  },
  {
    path: 'types/:name',
    loadComponent: () => import('./pages/type/type').then((m) => m.TypePage),
    resolve: { data: typeResolver },
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found').then((m) => m.NotFound),
  },
];
