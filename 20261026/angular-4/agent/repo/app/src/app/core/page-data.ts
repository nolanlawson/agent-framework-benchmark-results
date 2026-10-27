import { PLATFORM_ID, Service, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';

/**
 * Loads a page's view model. The server stores the result in TransferState so the browser
 * can hydrate without fetching again; later client-side navigations load it afresh.
 *
 * Only these compact view models cross the wire, never raw API responses (a single
 * Pokémon record is over half a megabyte).
 */
@Service()
export class PageData {
  private readonly state = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  async load<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const stateKey = makeStateKey<{ value: T }>(`page:${key}`);
    if (!this.isServer) {
      const transferred = this.state.get(stateKey, null);
      if (transferred) {
        this.state.remove(stateKey);
        return transferred.value;
      }
      return loader();
    }
    const value = await loader();
    this.state.set(stateKey, { value });
    return value;
  }
}
