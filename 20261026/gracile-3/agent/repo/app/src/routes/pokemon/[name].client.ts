// Moves section: sortable tables and switching games without a full page load.

const COLLATOR = new Intl.Collator('en');

function sortTable(table: HTMLTableElement, header: HTMLTableCellElement) {
	const key = header.dataset['key'] ?? '';
	const numeric = header.dataset['numeric'] === 'true';
	const direction = header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
	const sign = direction === 'ascending' ? 1 : -1;

	for (const th of table.tHead?.rows[0]?.cells ?? []) th.removeAttribute('aria-sort');
	header.setAttribute('aria-sort', direction);

	const body = table.tBodies[0];
	if (!body) return;
	const rows = [...body.rows].map((row, position) => ({ row, position, value: row.dataset[key] ?? '' }));
	rows.sort((a, b) => {
		// Missing values go last in both directions.
		if (!a.value || !b.value) return Number(!a.value) - Number(!b.value) || a.position - b.position;
		const order = numeric ? Number(a.value) - Number(b.value) : COLLATOR.compare(a.value, b.value);
		return order * sign || a.position - b.position;
	});
	body.append(...rows.map(({ row }) => row));
}

document.addEventListener('click', (event) => {
	const button = (event.target as Element).closest('table[data-sortable] th button');
	const header = button?.closest('th');
	const table = header?.closest('table');
	if (header && table) sortTable(table, header);
});

const gameForm = document.querySelector<HTMLFormElement>('[data-game-form]');
const select = gameForm?.querySelector<HTMLSelectElement>('select[name="game"]');

let latest = 0;
let shownGame = select?.value;
/** Swaps in the move tables for `game`. From a history entry, the URL is left alone. */
async function showGame(game: string, fromHistory = false) {
	const url = new URL(location.href);
	if (!fromHistory) url.searchParams.set('game', game);
	const ticket = ++latest;
	try {
		const response = await fetch(url.pathname + url.search);
		if (!response.ok) throw new Error(String(response.status));
		const page = new DOMParser().parseFromString(await response.text(), 'text/html');
		const tables = page.querySelector('[data-move-tables]');
		const current = document.querySelector('[data-move-tables]');
		if (!tables || !current) throw new Error('No move tables');
		if (ticket !== latest) return;
		current.replaceChildren(...[...tables.childNodes].map((node) => document.adoptNode(node)));
		shownGame = game;
		if (!fromHistory) history.pushState(null, '', url);
	} catch {
		location.assign(url);
	}
}

select?.addEventListener('change', () => void showGame(select.value));
gameForm?.addEventListener('submit', (event) => {
	event.preventDefault();
	if (select) void showGame(select.value);
});

window.addEventListener('popstate', () => {
	if (!select) return;
	const game = new URLSearchParams(location.search).get('game');
	const fallback = select.options[select.options.length - 1]?.value ?? '';
	select.value = game ?? fallback;
	// Ignore history entries that only differ by hash, e.g. jumping to #moves.
	if (select.value !== shownGame) void showGame(select.value, true);
});
