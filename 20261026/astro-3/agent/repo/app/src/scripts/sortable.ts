// Click-to-sort for tables marked with [data-sortable]. Cells carry their sort value in
// data-v; empty values are "missing" and always sort last.

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compare(a: string, b: string, kind: string) {
  return kind === 'number' ? Number(a) - Number(b) : collator.compare(a, b);
}

function sortTable(table: HTMLTableElement, th: HTMLTableCellElement) {
  const headers = [...table.tHead!.rows[0].cells];
  const index = headers.indexOf(th);
  const kind = th.dataset.kind ?? 'text';
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  const sign = direction === 'ascending' ? 1 : -1;

  for (const h of headers) h.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', direction);

  const body = table.tBodies[0];
  const rows = [...body.rows].map((row, position) => ({ row, position, value: row.cells[index]?.dataset.v ?? '' }));
  rows.sort((a, b) => {
    if (!a.value || !b.value) return (a.value ? 0 : 1) - (b.value ? 0 : 1) || a.position - b.position;
    return sign * compare(a.value, b.value, kind) || a.position - b.position;
  });
  body.append(...rows.map((r) => r.row));
}

export function initSortableTables(root: ParentNode) {
  for (const table of root.querySelectorAll<HTMLTableElement>('table[data-sortable]')) {
    if (table.dataset.sortReady) continue;
    table.dataset.sortReady = 'true';
    table.tHead?.addEventListener('click', (event) => {
      const th = (event.target as HTMLElement).closest('th');
      if (th && (event.target as HTMLElement).closest('button')) sortTable(table, th as HTMLTableCellElement);
    });
  }
}
