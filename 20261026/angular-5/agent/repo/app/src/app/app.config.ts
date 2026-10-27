import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { BrowserPokedexData, PokedexData } from './data/pokedex-data';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Navigations that only change filters or the selected game pass `scroll: 'manual'`.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch()),
    // Page data reaches the browser through TransferState (see PokedexData).
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    { provide: PokedexData, useClass: BrowserPokedexData },
  ],
};
