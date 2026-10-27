// Sortable move tables: clicking a column header sorts that table by the column,
// ascending first, then flipping. Missing values (empty data-v) always sort last.
document.addEventListener('click', (event) => {
  const button = event.target.closest('table.moves th button.sort');
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const headers = [...th.parentElement.children];
  const column = headers.indexOf(th);
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  const numeric = button.dataset.kind === 'num';
  const sign = direction === 'ascending' ? 1 : -1;

  const tbody = table.tBodies[0];
  const rows = [...tbody.rows].map((row) => ({ row, value: row.cells[column].dataset.v ?? '' }));
  rows.sort((a, b) => {
    if (a.value === '' || b.value === '') return (a.value === '') - (b.value === '');
    const cmp = numeric ? Number(a.value) - Number(b.value) : a.value.localeCompare(b.value);
    return cmp * sign;
  });
  tbody.append(...rows.map((r) => r.row));

  for (const h of headers) h.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', direction);
});
