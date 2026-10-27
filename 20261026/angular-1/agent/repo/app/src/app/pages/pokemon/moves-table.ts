import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { orMissing } from '../../core/format';
import { TypeBadge } from '../../shared/type-badge';
import { MoveRow, MoveTable } from './moves-data';

type Column = 'level' | 'label' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'label', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function sortValue(row: MoveRow, column: Column): string | number | null {
  return column === 'type' ? row.type.label : row[column];
}

/** A learn method's moves, sortable by any column. Missing values always sort last. */
@Component({
  selector: 'app-moves-table',
  imports: [RouterLink, TypeBadge],
  template: `
    <table class="moves-table">
      <caption>{{ table().label }}</caption>
      <thead>
        <tr>
          @for (column of columns(); track column.key) {
            <th scope="col" [attr.aria-sort]="sort()?.column === column.key ? sort()!.direction : null">
              <button type="button" class="sort-button" (click)="sortBy(column.key)">
                {{ column.label }}
                @if (sort()?.column === column.key) {
                  <span class="sort-indicator" aria-hidden="true">{{ sort()!.direction === 'ascending' ? '▲' : '▼' }}</span>
                }
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @if (table().showLevel) {
              <td>{{ orMissing(row.level) }}</td>
            }
            <td><a [routerLink]="['/moves', row.name]">{{ row.label }}</a></td>
            <td><app-type-badge [name]="row.type.name" [label]="row.type.label" /></td>
            <td>{{ orMissing(row.category) }}</td>
            <td>{{ orMissing(row.power) }}</td>
            <td>{{ orMissing(row.accuracy) }}</td>
            <td>{{ orMissing(row.pp) }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class MovesTable {
  readonly table = input.required<MoveTable>();

  protected readonly sort = signal<{ column: Column; direction: Direction } | null>(null);
  protected readonly orMissing = orMissing;

  protected readonly columns = computed(() => COLUMNS.filter((c) => c.key !== 'level' || this.table().showLevel));

  protected readonly rows = computed(() => {
    const rows = this.table().rows;
    const sort = this.sort();
    if (!sort) return rows;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    // Array.prototype.sort is stable, so ties keep the default order.
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.column);
      const y = sortValue(b, sort.column);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sign * order;
    });
  });

  protected sortBy(column: Column) {
    const current = this.sort();
    const direction: Direction =
      current?.column === column && current.direction === 'ascending' ? 'descending' : 'ascending';
    this.sort.set({ column, direction });
  }
}
