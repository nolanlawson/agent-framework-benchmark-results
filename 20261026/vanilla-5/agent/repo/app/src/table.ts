import { h, replaceChildren, type Child } from './dom';

export interface Column<T> {
  label: string;
  /** Sort key; `null` means missing, which always sorts last. */
  value: (row: T) => string | number | null;
  cell: (row: T) => Child;
  numeric?: boolean;
}

/** A table whose column headers sort it: ascending on first click, then toggling. */
export function sortableTable<T>(caption: string, columns: Column<T>[], rows: T[]): HTMLElement {
  const body = h('tbody');
  let sortIndex = -1;
  let ascending = true;

  const renderBody = () => {
    let sorted = rows;
    if (sortIndex >= 0) {
      const column = columns[sortIndex];
      const dir = ascending ? 1 : -1;
      sorted = rows
        .map((row, i) => ({ row, i, key: column.value(row) }))
        .sort((a, b) => {
          if (a.key == null || b.key == null) return a.key == null ? (b.key == null ? a.i - b.i : 1) : -1;
          const cmp = typeof a.key === 'number' && typeof b.key === 'number' ? a.key - b.key : String(a.key).localeCompare(String(b.key));
          return cmp * dir || a.i - b.i;
        })
        .map((entry) => entry.row);
    }
    replaceChildren(
      body,
      sorted.map((row) =>
        h('tr', null, columns.map((c) => h('td', { class: c.numeric ? 'num' : null }, c.cell(row)))),
      ),
    );
  };

  const headers = columns.map((column, index) => {
    const indicator = h('span', { class: 'sort-indicator', 'aria-hidden': 'true' });
    const th = h(
      'th',
      { scope: 'col' },
      h(
        'button',
        {
          type: 'button',
          class: 'sort-button',
          onClick: () => {
            ascending = sortIndex === index ? !ascending : true;
            sortIndex = index;
            headers.forEach(({ th: other, indicator: otherIndicator }, i) => {
              if (i === index) {
                other.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
                otherIndicator.textContent = ascending ? '▲' : '▼';
              } else {
                other.removeAttribute('aria-sort');
                otherIndicator.textContent = '';
              }
            });
            renderBody();
          },
        },
        column.label,
        indicator,
      ),
    );
    return { th, indicator };
  });

  renderBody();
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('caption', null, caption),
      h('thead', null, h('tr', null, headers.map((x) => x.th))),
      body,
    ),
  );
}
