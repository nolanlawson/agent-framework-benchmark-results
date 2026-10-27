// Click-to-sort for tables marked data-sortable. Uses event delegation so tables
// swapped in later work too. Cells carry their sort key in data-value; empty
// values always sort last.
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function sortTable(table, th) {
  const column = Number(th.dataset.column);
  const numeric = th.hasAttribute('data-numeric');
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  const sign = direction === 'ascending' ? 1 : -1;

  for (const other of table.querySelectorAll('thead th')) other.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', direction);

  const tbody = table.tBodies[0];
  const rows = [...tbody.rows].map((row, index) => ({ row, index, value: row.cells[column]?.dataset.value ?? '' }));
  rows.sort((a, b) => {
    if (a.value === '' || b.value === '') return (a.value === '') - (b.value === '') || a.index - b.index;
    const diff = numeric ? Number(a.value) - Number(b.value) : collator.compare(a.value, b.value);
    return diff * sign || a.index - b.index;
  });
  tbody.append(...rows.map((r) => r.row));
}

document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('table[data-sortable] thead th button') : null;
  if (!button) return;
  const th = button.closest('th');
  sortTable(th.closest('table'), th);
});
