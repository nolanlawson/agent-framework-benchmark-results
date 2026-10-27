// Click-to-sort for tables marked with `data-sortable`. Each header holds a button; each
// cell carries its sort key in `data-sort` (empty for missing values, which always sort
// last). Uses event delegation so tables swapped in later keep working.

type Direction = 'ascending' | 'descending';

function sortTable(table: HTMLTableElement, column: number, direction: Direction) {
  const header = table.tHead?.rows[0];
  const numeric = header?.cells[column]?.dataset.type === 'number';
  const body = table.tBodies[0];
  if (!body) return;
  const keyed = [...body.rows].map((row, index) => ({ row, index, key: row.cells[column]?.dataset.sort ?? '' }));
  const sign = direction === 'ascending' ? 1 : -1;
  keyed.sort((a, b) => {
    if (a.key === '' || b.key === '') return (a.key === '' ? 1 : 0) - (b.key === '' ? 1 : 0) || a.index - b.index;
    const diff = numeric ? Number(a.key) - Number(b.key) : a.key.localeCompare(b.key);
    return sign * diff || a.index - b.index;
  });
  body.append(...keyed.map((k) => k.row));
}

export function enhanceSortableTables(root: Document) {
  root.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.('table[data-sortable] th button');
    if (!button) return;
    const th = button.closest('th')!;
    const table = th.closest('table')!;
    const direction: Direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    for (const other of table.querySelectorAll('thead th')) other.removeAttribute('aria-sort');
    th.setAttribute('aria-sort', direction);
    sortTable(table, th.cellIndex, direction);
  });
}
