import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DATA_HANDLER } from './data';
import { handleDataRequest } from '../server/pokedex-data';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DATA_HANDLER, useValue: handleDataRequest },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
