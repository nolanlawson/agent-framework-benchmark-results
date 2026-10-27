<script lang="ts">
	import { orMissing } from '#lib/format.ts';
	import TypeBadge from './TypeBadge.svelte';

	interface Row {
		level: number | null;
		name: string;
		label: string;
		type: string;
		typeLabel: string;
		category: string | null;
		power: number | null;
		accuracy: number | null;
		pp: number | null;
	}
	type Key = 'level' | 'label' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';

	let { caption, rows, showLevel }: { caption: string; rows: Row[]; showLevel: boolean } = $props();

	const columns: { key: Key; label: string }[] = $derived([
		...(showLevel ? [{ key: 'level' as const, label: 'Level' }] : []),
		{ key: 'label', label: 'Move' },
		{ key: 'typeLabel', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	let sort = $state<{ key: Key; direction: 'ascending' | 'descending' } | null>(null);

	const sorted = $derived.by(() => {
		if (!sort) return rows;
		const { key, direction } = sort;
		const sign = direction === 'ascending' ? 1 : -1;
		return rows
			.map((row, index) => ({ row, index }))
			.sort((a, b) => {
				const x = a.row[key];
				const y = b.row[key];
				// Missing values go last whichever way the column is sorted.
				if (x === null || y === null) return x === y ? a.index - b.index : x === null ? 1 : -1;
				const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
				return sign * order || a.index - b.index;
			})
			.map(({ row }) => row);
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
		<caption>{caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" aria-sort={sort?.key === column.key ? sort.direction : undefined}>
						<button type="button" onclick={() => toggle(column.key)}>
							{column.label}
							{#if sort?.key === column.key}
								<span class="arrow" aria-hidden="true">{sort.direction === 'ascending' ? '▲' : '▼'}</span>
							{/if}
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sorted as row, i (`${row.name}-${row.level}-${i}`)}
				<tr>
					{#if showLevel}<td>{orMissing(row.level)}</td>{/if}
					<td><a href="/moves/{row.name}">{row.label}</a></td>
					<td><TypeBadge name={row.type} label={row.typeLabel} link /></td>
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
		border: 0;
		background: none;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	th button:hover {
		color: var(--color-text);
	}

	.arrow {
		font-size: var(--text-xs);
	}

	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
</style>
