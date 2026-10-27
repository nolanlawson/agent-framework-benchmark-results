import { Component, computed, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MISSING } from '../../core/format';
import { TypeBadge } from '../../shared/type-badge';
import { MoveRow, MoveTable } from './pokemon-data';

type ColumnKey = 'level' | 'label' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

interface Column {
  key: ColumnKey;
  label: string;
  value: (row: MoveRow) => string | number | null;
}

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level', value: (r) => r.level },
  { key: 'label', label: 'Move', value: (r) => r.label },
  { key: 'type', label: 'Type', value: (r) => r.type.label },
  { key: 'category', label: 'Category', value: (r) => r.category },
  { key: 'power', label: 'Power', value: (r) => r.power },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.accuracy },
  { key: 'pp', label: 'PP', value: (r) => r.pp },
];

/** One learn method's moves, sortable by any column. Missing values always sort last. */
@Component({
  selector: 'app-move-table',
  imports: [RouterLink, TypeBadge],
  template: `
    <div class="table-scroll">
      <table class="move-table">
        <caption>{{ table().label }}</caption>
        <thead>
          <tr>
            @for (column of columns(); track column.key) {
              <th scope="col" [attr.aria-sort]="sort()?.column === column.key ? sort()!.direction : null">
                <button type="button" class="sort-button" (click)="sortBy(column.key)">
                  {{ column.label }}
                  @if (sort()?.column === column.key) {
                    <span aria-hidden="true">{{ sort()!.direction === 'ascending' ? '▲' : '▼' }}</span>
                  }
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.name + ":" + row.level) {
            <tr>
              @if (hasLevel()) {
                <td>{{ row.level }}</td>
              }
              <td><a [routerLink]="['/moves', row.name]">{{ row.label }}</a></td>
              <td><app-type-badge [type]="row.type" /></td>
              <td>{{ row.category ?? missing }}</td>
              <td>{{ row.power ?? missing }}</td>
              <td>{{ row.accuracy ?? missing }}</td>
              <td>{{ row.pp ?? missing }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MoveTableView {
  readonly table = input.required<MoveTable>();

  protected readonly missing = MISSING;
  protected readonly hasLevel = computed(() => this.table().method === 'level-up');
  protected readonly columns = computed(() => COLUMNS.filter((c) => c.key !== 'level' || this.hasLevel()));

  /** User-chosen sort; `null` keeps the table's default order. Resets when the rows change. */
  protected readonly sort = linkedSignal<MoveTable, { column: ColumnKey; direction: Direction } | null>({
    source: this.table,
    computation: () => null,
  });

  protected readonly rows = computed(() => {
    const rows = this.table().rows;
    const sort = this.sort();
    if (!sort) return rows;
    const column = COLUMNS.find((c) => c.key === sort.column)!;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    // Array.prototype.sort is stable, so ties keep the default order.
    return [...rows].sort((a, b) => {
      const x = column.value(a);
      const y = column.value(b);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sign * order;
    });
  });

  protected sortBy(column: ColumnKey) {
    const current = this.sort();
    const direction: Direction =
      current?.column === column && current.direction === 'ascending' ? 'descending' : 'ascending';
    this.sort.set({ column, direction });
  }
}
