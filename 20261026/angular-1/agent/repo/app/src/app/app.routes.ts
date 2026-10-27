import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  { path: 'pokemon/:name', loadComponent: () => import('./pages/pokemon/pokemon-page').then((m) => m.PokemonPage) },
  { path: 'moves/:name', loadComponent: () => import('./pages/move-page').then((m) => m.MovePage) },
  { path: 'abilities/:name', loadComponent: () => import('./pages/ability-page').then((m) => m.AbilityPage) },
  { path: 'types', title: 'Types – Pokédex', loadComponent: () => import('./pages/types-page').then((m) => m.TypesPage) },
  { path: 'types/:name', loadComponent: () => import('./pages/type-page').then((m) => m.TypePage) },
  { path: '**', title: 'Not found – Pokédex', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
