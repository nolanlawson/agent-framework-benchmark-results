import { inject, Injectable, makeStateKey, PendingTasks, TransferState } from '@angular/core';
import { DataParams, dataUrl, PokedexData } from '../app/data/pokedex-data';
import { loadData } from './pokeapi';

/** Computes view models in-process and hands them to the browser through TransferState. */
@Injectable()
export class ServerPokedexData extends PokedexData {
  private readonly transferState = inject(TransferState);
  private readonly pendingTasks = inject(PendingTasks);

  async load<T>(path: string, params: DataParams = {}): Promise<T | null> {
    const url = dataUrl(path, params);
    const done = this.pendingTasks.add();
    try {
      const value = (await loadData(path, new URL(url, 'http://localhost').searchParams)) as T | null;
      this.transferState.set(makeStateKey<T | null>(url), value);
      return value;
    } finally {
      done();
    }
  }
}
