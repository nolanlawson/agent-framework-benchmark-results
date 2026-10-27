import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  RedirectCommand,
  Router,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { LOAD_ERROR_STATE } from './shared/load-error';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // A failed data load shows an error page at the same URL.
      withNavigationErrorHandler((error) => {
        console.error(error.error);
        const router = inject(Router);
        return new RedirectCommand(error.url ? router.parseUrl(error.url) : router.parseUrl('/'), {
          skipLocationChange: true,
          state: { [LOAD_ERROR_STATE]: true },
        });
      }),
    ),
    provideClientHydration(withEventReplay()),
  ],
};
