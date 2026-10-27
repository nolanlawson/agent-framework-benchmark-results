// Client-side sorting for the moves tables. Uses event delegation so it keeps working
// after htmx swaps in a different game's tables.
document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('table.sortable th .sort-button') : null;
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const headers = [...th.parentElement.children];
  const column = headers.indexOf(th);
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  const numeric = th.dataset.sortType === 'number';
  const sign = direction === 'ascending' ? 1 : -1;

  const tbody = table.tBodies[0];
  const rows = [...tbody.rows].map((row, index) => {
    const raw = row.cells[column]?.dataset.sort ?? '';
    return { row, index, missing: raw === '', value: numeric ? Number(raw) : raw };
  });
  rows.sort((a, b) => {
    // Missing values sort last in both directions.
    if (a.missing !== b.missing) return a.missing ? 1 : -1;
    if (a.missing) return a.index - b.index;
    const cmp = numeric ? a.value - b.value : a.value.localeCompare(b.value);
    return cmp * sign || a.index - b.index;
  });
  tbody.append(...rows.map((r) => r.row));

  for (const header of headers) header.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', direction);
});
