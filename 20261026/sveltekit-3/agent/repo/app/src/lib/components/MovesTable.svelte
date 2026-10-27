<script lang="ts">
	import { orMissing } from '../format.ts';
	import type { MoveRow, MoveTable } from '../types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { table }: { table: MoveTable } = $props();

	type Key = 'level' | 'label' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
	type Direction = 'ascending' | 'descending';

	const isLevelUp = $derived(table.method === 'level-up');
	const columns = $derived<{ key: Key; label: string }[]>([
		...(isLevelUp ? [{ key: 'level' as const, label: 'Level' }] : []),
		{ key: 'label', label: 'Move' },
		{ key: 'type', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	let sort = $state<{ key: Key; direction: Direction } | null>(null);

	function valueOf(row: MoveRow, key: Key): string | number | null {
		return key === 'type' ? row.type.label : row[key];
	}

	function compareDefault(a: MoveRow, b: MoveRow) {
		return (isLevelUp ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label);
	}

	const rows = $derived.by(() => {
		const sorted = [...table.rows].sort(compareDefault);
		if (!sort) return sorted;
		const { key, direction } = sort;
		const sign = direction === 'ascending' ? 1 : -1;
		// Array#sort is stable, so ties keep the default order. Missing values go last
		// in both directions.
		return sorted.sort((a, b) => {
			const va = valueOf(a, key);
			const vb = valueOf(b, key);
			if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
			const diff = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
			return sign * diff;
		});
	});

	function toggle(key: Key) {
		sort =
			sort?.key === key
				? { key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' }
				: { key, direction: 'ascending' };
	}
</script>

<div class="scroll">
	<table>
		<caption>{table.label}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					{@const direction = sort?.key === column.key ? sort.direction : undefined}
					<th scope="col" aria-sort={direction}>
						<button type="button" onclick={() => toggle(column.key)}>
							{column.label}{#if direction}<span class="indicator" aria-hidden="true"
									>{direction === 'ascending' ? '▲' : '▼'}</span
								>{/if}
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (i)}
				<tr>
					{#if isLevelUp}<td>{orMissing(row.level)}</td>{/if}
					<td><a href="/moves/{row.name}">{row.label}</a></td>
					<td><TypeBadge type={row.type} link /></td>
					<td>{orMissing(row.category)}</td>
					<td>{orMissing(row.power)}</td>
					<td>{orMissing(row.accuracy)}</td>
					<td>{orMissing(row.pp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		overflow-x: auto;
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
		white-space: nowrap;
	}

	th button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
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

	.indicator {
		font-size: 0.625rem;
	}

	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
</style>
