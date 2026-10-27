// Sortable move tables: clicking a column header sorts that table by the column,
// ascending first, flipping on the next click. Missing values always sort last.
document.addEventListener('click', (event) => {
  const button = event.target.closest('.sortable .sort-button');
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const headers = [...th.parentElement.children];
  const index = headers.indexOf(th);
  const numeric = th.dataset.sortKind === 'num';
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

  for (const h of headers) h.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', direction);

  const sign = direction === 'ascending' ? 1 : -1;
  const tbody = table.tBodies[0];
  const keyed = [...tbody.rows].map((row) => {
    const raw = row.cells[index]?.dataset.sort ?? '';
    return { row, missing: raw === '', value: numeric ? Number(raw) : raw };
  });
  keyed.sort((a, b) => {
    if (a.missing || b.missing) return a.missing - b.missing;
    const diff = numeric ? a.value - b.value : a.value.localeCompare(b.value);
    return diff * sign;
  });
  tbody.append(...keyed.map((k) => k.row));
});
