<script lang="ts">
	import { display, DASH } from '../util.ts';
	import TypeBadge from './TypeBadge.svelte';

	interface Row {
		level: number | null;
		name: string;
		label: string;
		type: { name: string; label: string } | null;
		category: string | null;
		power: number | null;
		accuracy: number | null;
		pp: number | null;
	}

	type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';

	let { caption, rows, showLevel = false }: { caption: string; rows: Row[]; showLevel?: boolean } = $props();

	let sortBy = $state<Column | null>(null);
	let direction = $state<'ascending' | 'descending'>('ascending');

	const columns = $derived<{ key: Column; label: string }[]>([
		...(showLevel ? [{ key: 'level' as const, label: 'Level' }] : []),
		{ key: 'move', label: 'Move' },
		{ key: 'type', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	function value(row: Row, column: Column): string | number | null {
		switch (column) {
			case 'level':
				return row.level;
			case 'move':
				return row.label;
			case 'type':
				return row.type?.label ?? null;
			case 'category':
				return row.category;
			default:
				return row[column];
		}
	}

	function compare(a: string | number | null, b: string | number | null): number {
		if (typeof a === 'number' && typeof b === 'number') return a - b;
		return String(a).localeCompare(String(b));
	}

	const byName = (a: Row, b: Row) => a.label.localeCompare(b.label);

	const sorted = $derived.by(() => {
		const copy = [...rows];
		if (!sortBy) {
			return copy.sort((a, b) => (showLevel ? (a.level ?? 0) - (b.level ?? 0) : 0) || byName(a, b));
		}
		const column = sortBy;
		const sign = direction === 'ascending' ? 1 : -1;
		return copy.sort((a, b) => {
			const va = value(a, column);
			const vb = value(b, column);
			// Missing values sort last in both directions.
			if (va === null && vb === null) return byName(a, b);
			if (va === null) return 1;
			if (vb === null) return -1;
			return sign * compare(va, vb) || byName(a, b);
		});
	});

	function toggle(column: Column) {
		if (sortBy === column) {
			direction = direction === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortBy = column;
			direction = 'ascending';
		}
	}
</script>

<div class="scroller">
	<table>
		<caption>{caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" aria-sort={sortBy === column.key ? direction : undefined}>
						<button type="button" onclick={() => toggle(column.key)}>
							{column.label}<span class="arrow" aria-hidden="true"
								>{sortBy === column.key ? (direction === 'ascending' ? ' ▲' : ' ▼') : ''}</span
							>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sorted as row (`${row.name}-${row.level}`)}
				<tr>
					{#if showLevel}<td>{display(row.level)}</td>{/if}
					<td><a href="/moves/{row.name}">{row.label}</a></td>
					<td>
						{#if row.type}<TypeBadge type={row.type} link />{:else}{DASH}{/if}
					</td>
					<td>{display(row.category)}</td>
					<td>{display(row.power)}</td>
					<td>{display(row.accuracy)}</td>
					<td>{display(row.pp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroller {
		overflow-x: auto;
	}

	.scroller + :global(.scroller) {
		margin-top: var(--space-5);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	caption {
		text-align: left;
		font-size: var(--text-base);
		padding-bottom: var(--space-2);
	}

	th {
		text-align: left;
		font-weight: var(--weight-normal);
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--color-border);
		padding: 0;
		white-space: nowrap;
	}

	th button {
		display: block;
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 0;
		color: inherit;
		font-size: inherit;
		text-align: left;
		cursor: pointer;
	}

	th button:hover {
		color: var(--color-text);
	}

	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
		height: 2.5625rem;
	}
</style>
