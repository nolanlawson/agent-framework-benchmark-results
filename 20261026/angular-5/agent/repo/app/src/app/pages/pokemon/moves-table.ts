import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MoveRow, MoveTable } from '../../data/models';
import { orMissing } from '../../shared/format';
import { TypeBadge } from '../../shared/type-badge';

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const COLUMNS: { key: Column; label: string; value: (row: MoveRow) => string | number | null }[] = [
  { key: 'level', label: 'Level', value: (r) => r.level },
  { key: 'move', label: 'Move', value: (r) => r.label },
  { key: 'type', label: 'Type', value: (r) => r.type.label },
  { key: 'category', label: 'Category', value: (r) => r.category },
  { key: 'power', label: 'Power', value: (r) => r.power },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.accuracy },
  { key: 'pp', label: 'PP', value: (r) => r.pp },
];

/** The moves a Pokémon learns by one method, sortable by any column. */
@Component({
  selector: 'app-moves-table',
  imports: [RouterLink, TypeBadge],
  templateUrl: './moves-table.html',
  styleUrl: './moves-table.css',
})
export class MovesTable {
  readonly table = input.required<MoveTable>();

  protected readonly orMissing = orMissing;

  protected readonly columns = computed(() =>
    COLUMNS.filter((c) => c.key !== 'level' || this.table().method === 'level-up'),
  );

  /** Null until a header is clicked; the rows then keep the server's default order. */
  protected readonly sort = signal<{ column: Column; direction: Direction } | null>(null);

  protected readonly rows = computed(() => {
    const rows = this.table().rows;
    const sort = this.sort();
    if (!sort) return rows;
    const value = COLUMNS.find((c) => c.key === sort.column)!.value;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      // Missing values go last whichever the direction.
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sign * order;
    });
  });

  protected ariaSort(column: Column): Direction | null {
    const sort = this.sort();
    return sort?.column === column ? sort.direction : null;
  }

  protected toggleSort(column: Column): void {
    this.sort.update((sort) => ({
      column,
      direction: sort?.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  }
}
