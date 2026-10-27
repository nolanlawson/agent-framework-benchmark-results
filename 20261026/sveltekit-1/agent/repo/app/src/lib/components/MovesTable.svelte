<script lang="ts">
	import { orDash } from '#lib/format.ts';
	import type { MoveRow, MoveTable } from '#lib/types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { table }: { table: MoveTable } = $props();

	type Key = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
	type Direction = 'ascending' | 'descending';

	const value: Record<Key, (row: MoveRow) => string | number | null> = {
		level: (row) => row.level,
		move: (row) => row.label,
		type: (row) => row.type.label,
		category: (row) => row.category,
		power: (row) => row.power,
		accuracy: (row) => row.accuracy,
		pp: (row) => row.pp
	};

	const columns = $derived(
		(
			[
				['level', 'Level'],
				['move', 'Move'],
				['type', 'Type'],
				['category', 'Category'],
				['power', 'Power'],
				['accuracy', 'Accuracy'],
				['pp', 'PP']
			] as [Key, string][]
		).filter(([key]) => key !== 'level' || table.method === 'level-up')
	);

	let sort = $state<{ key: Key; direction: Direction } | null>(null);

	function toggle(key: Key) {
		sort =
			sort?.key === key
				? { key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' }
				: { key, direction: 'ascending' };
	}

	const rows = $derived.by(() => {
		if (!sort) return table.rows;
		const { key, direction } = sort;
		const get = value[key];
		const sign = direction === 'ascending' ? 1 : -1;
		return [...table.rows].sort((a, b) => {
			const x = get(a);
			const y = get(b);
			// Missing values go last whichever way the column is sorted.
			if (x === null || y === null) {
				if (x === y) return a.label.localeCompare(b.label);
				return x === null ? 1 : -1;
			}
			const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
			return sign * order || a.label.localeCompare(b.label) || (a.level ?? 0) - (b.level ?? 0);
		});
	});
</script>

<div class="scroll">
	<table>
		<caption>{table.label}</caption>
		<thead>
			<tr>
				{#each columns as [key, label] (key)}
					<th scope="col" aria-sort={sort?.key === key ? sort.direction : undefined}>
						<button type="button" onclick={() => toggle(key)}>
							{label}<span class="arrow" aria-hidden="true"
								>{sort?.key === key ? (sort.direction === 'ascending' ? '▲' : '▼') : ''}</span
							>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (`${row.name}-${row.level}-${i}`)}
				<tr>
					{#if table.method === 'level-up'}
						<td>{orDash(row.level)}</td>
					{/if}
					<td><a href="/moves/{row.name}">{row.label}</a></td>
					<td><TypeBadge type={row.type} link /></td>
					<td>{orDash(row.category)}</td>
					<td>{orDash(row.power)}</td>
					<td>{orDash(row.accuracy)}</td>
					<td>{orDash(row.pp)}</td>
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
		white-space: nowrap;
	}

	caption {
		padding-bottom: var(--space-3);
		font-size: var(--text-base);
		text-align: left;
	}

	th {
		padding: 0;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
		text-align: left;
	}

	th button {
		display: flex;
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

	.arrow {
		font-size: 0.625rem;
	}

	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		height: 2.5625rem;
	}
</style>
