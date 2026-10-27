import { Component, computed, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearnMethod, LearnRow } from '../models';
import { TypeBadge } from '../shared/type-badge';

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function value(row: LearnRow, column: Column): string | number | null {
  switch (column) {
    case 'level':
      return row.level;
    case 'move':
      return row.move.label;
    case 'type':
      return row.move.type.label;
    case 'category':
      return row.move.category;
    default:
      return row.move[column];
  }
}

function compare(a: string | number | null, b: string | number | null): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/** One learn method's moves, sortable by any column. */
@Component({
  selector: 'app-move-table',
  imports: [RouterLink, TypeBadge],
  templateUrl: './move-table.html',
  styleUrl: './move-table.css',
})
export class MoveTable {
  readonly method = input.required<LearnMethod>();

  protected readonly columns = computed(() =>
    COLUMNS.filter((c) => c.key !== 'level' || this.method().name === 'level-up'),
  );

  /** The user-chosen sort; null keeps the default order. Resets when the data changes. */
  protected readonly sort = linkedSignal<LearnMethod, { column: Column; direction: Direction } | null>({
    source: this.method,
    computation: () => null,
  });

  protected readonly rows = computed(() => {
    const rows = this.method().rows;
    const sort = this.sort();
    if (!sort) return rows;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = value(a, sort.column);
      const vb = value(b, sort.column);
      // Missing values go last whichever way the column is sorted.
      if (va === null || vb === null) {
        if (va !== vb) return va === null ? 1 : -1;
      } else {
        const c = compare(va, vb);
        if (c) return c * sign;
      }
      return a.move.label.localeCompare(b.move.label) || (a.level ?? 0) - (b.level ?? 0);
    });
  });

  protected ariaSort(column: Column): Direction | null {
    const sort = this.sort();
    return sort?.column === column ? sort.direction : null;
  }

  protected toggle(column: Column): void {
    const sort = this.sort();
    this.sort.set({
      column,
      direction: sort?.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending',
    });
  }

  protected show(v: number | string | null): string | number {
    return v ?? '—';
  }
}
