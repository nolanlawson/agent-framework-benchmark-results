import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { ServerPokedexData } from '../server/server-pokedex-data';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { PokedexData } from './data/pokedex-data';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: PokedexData, useClass: ServerPokedexData },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
