/**
 * Sortable move tables: clicking a column header sorts the rows by that column,
 * ascending first, then flipping. Missing values (empty `data-sort`) always sort last.
 */
class SortableTable extends HTMLElement {
	connectedCallback() {
		const table = this.querySelector('table');
		if (!table) return;
		table.querySelectorAll<HTMLTableCellElement>('thead th').forEach((th, index) => {
			th.querySelector('button')?.addEventListener('click', () => this.#sort(table, th, index));
		});
	}

	#sort(table: HTMLTableElement, th: HTMLTableCellElement, index: number) {
		const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
		table.querySelectorAll('thead th').forEach((other) => other.removeAttribute('aria-sort'));
		th.setAttribute('aria-sort', direction);

		const numeric = th.dataset.type === 'number';
		const sign = direction === 'ascending' ? 1 : -1;
		const tbody = table.tBodies[0]!;
		const rows = [...tbody.rows].map((row, position) => ({
			row,
			position,
			value: row.cells[index]?.dataset.sort ?? '',
		}));
		rows.sort((a, b) => {
			if (a.value === '' || b.value === '') {
				if (a.value === b.value) return a.position - b.position;
				return a.value === '' ? 1 : -1;
			}
			const diff = numeric
				? Number(a.value) - Number(b.value)
				: a.value.localeCompare(b.value);
			return sign * diff || a.position - b.position;
		});
		tbody.append(...rows.map((r) => r.row));
	}
}

/** Switches the game of the moves section without a full page reload. */
class GamePicker extends HTMLElement {
	#controller: AbortController | undefined;

	connectedCallback() {
		const select = this.querySelector('select');
		select?.addEventListener('change', () => void this.#show(select.value));
		this.querySelector('form')?.addEventListener('submit', (event) => {
			event.preventDefault();
			if (select) void this.#show(select.value);
		});
	}

	async #show(game: string) {
		const url = new URL(location.href);
		url.searchParams.set('game', game);
		url.hash = 'moves';
		history.replaceState(null, '', url);

		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		try {
			const res = await fetch(url.pathname + url.search, { signal: controller.signal });
			const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
			if (controller.signal.aborted) return;
			const next = doc.getElementById('moves-tables');
			const current = document.getElementById('moves-tables');
			if (next && current) current.replaceWith(document.importNode(next, true));
		} catch (error) {
			if ((error as Error).name !== 'AbortError') location.assign(url);
		}
	}
}

customElements.define('sortable-table', SortableTable);
customElements.define('game-picker', GamePicker);
