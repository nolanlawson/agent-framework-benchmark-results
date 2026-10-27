import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type DataParams = Record<string, string | null | undefined>;

const CACHE_TTL_MS = 60_000;

/** URL of a data endpoint, with empty params left out and the rest in a stable order. */
export function dataUrl(path: string, params: DataParams = {}): string {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string] => !!entry[1])
      .sort(([a], [b]) => a.localeCompare(b)),
  ).toString();
  return `/data/${path}${search ? `?${search}` : ''}`;
}

/**
 * Loads page view models. Resolves to `null` when the page or the resource it names
 * doesn't exist. The server implementation computes them directly from the PokeAPI;
 * the browser one reuses what the server rendered, then asks the server's data endpoint.
 */
export abstract class PokedexData {
  abstract load<T>(path: string, params?: DataParams): Promise<T | null>;
}

@Injectable()
export class BrowserPokedexData extends PokedexData {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly cache = new Map<string, { expires: number; value: Promise<unknown> }>();

  load<T>(path: string, params?: DataParams): Promise<T | null> {
    const url = dataUrl(path, params);

    const stateKey = makeStateKey<T | null>(url);
    if (this.transferState.hasKey(stateKey)) {
      const value = this.transferState.get(stateKey, null);
      this.transferState.remove(stateKey);
      this.remember(url, Promise.resolve(value));
      return Promise.resolve(value);
    }

    const hit = this.cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.value as Promise<T | null>;

    const value = firstValueFrom(this.http.get<T>(url)).catch((err: unknown) => {
      this.cache.delete(url);
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      throw err;
    });
    this.remember(url, value);
    return value;
  }

  private remember(url: string, value: Promise<unknown>): void {
    this.cache.set(url, { expires: Date.now() + CACHE_TTL_MS, value });
  }
}
