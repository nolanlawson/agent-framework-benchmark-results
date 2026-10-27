import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

export const DEFAULT_API_BASE_URL = 'http://localhost:9000';

/** The server reads `API_BASE_URL` at runtime and hands it to the browser through this key. */
export const API_BASE_URL_STATE_KEY = makeStateKey<string>('apiBaseUrl');

/** Origin of the PokeAPI server, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => inject(TransferState).get(API_BASE_URL_STATE_KEY, DEFAULT_API_BASE_URL),
});
