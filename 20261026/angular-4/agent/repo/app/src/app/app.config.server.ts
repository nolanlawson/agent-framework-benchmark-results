import {
  ApplicationConfig,
  TransferState,
  inject,
  mergeApplicationConfig,
  provideAppInitializer,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL, API_BASE_URL_STATE_KEY, DEFAULT_API_BASE_URL } from './core/api-base-url';

/** Read at request time, so the same build can point at any API server. */
function apiBaseUrlFromEnv(): string {
  return (process.env['API_BASE_URL'] || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE_URL, useFactory: apiBaseUrlFromEnv },
    // Hand the API origin to the browser.
    provideAppInitializer(() => {
      inject(TransferState).set(API_BASE_URL_STATE_KEY, inject(API_BASE_URL));
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
