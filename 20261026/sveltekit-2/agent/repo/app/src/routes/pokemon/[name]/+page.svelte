<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MovesTable from '#lib/components/MovesTable.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { dexNumber, MISSING } from '#lib/format.ts';
	import type { EvolutionNode } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const STAT_MAX = 255;
	const total = $derived(data.stats.reduce((sum, s) => sum + s.value, 0));

	function selectGame(game: string) {
		const url = new URL(page.url.href);
		url.searchParams.set('game', game);
		url.hash = '';
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head>
	<title>{data.title} – Pokédex</title>
</svelte:head>

{#snippet evolution(node: EvolutionNode)}
	<li>
		<a href="/pokemon/{node.name}" aria-current={node.name === data.name ? 'page' : undefined}>{node.label}</a>
		{#if node.children.length}
			<ul>
				{#each node.children as child (child.name)}
					{@render evolution(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<div class="stack">
	<div class="summary">
		<div class="artwork">
			{#if data.artwork}
				<img src={data.artwork} alt={data.title} width="475" height="475" />
			{/if}
		</div>
		<div class="info">
			<p class="dex muted">{dexNumber(data.id)}</p>
			<h1>{data.title}</h1>
			{#if data.genus}<p class="genus muted">{data.genus}</p>{/if}
			<p class="types">
				{#each data.types as type (type.name)}
					<TypeBadge name={type.name} label={type.label} link />
				{/each}
			</p>
			<dl class="measures">
				<div>
					<dt>Height</dt>
					<dd>{(data.height / 10).toFixed(1)} m</dd>
				</div>
				<div>
					<dt>Weight</dt>
					<dd>{(data.weight / 10).toFixed(1)} kg</dd>
				</div>
			</dl>
			<p class="flavor">{data.flavorText ?? MISSING}</p>
		</div>
	</div>

	<section class="panel" aria-labelledby="stats-heading">
		<h2 id="stats-heading">Base stats</h2>
		<table class="stats">
			<tbody>
				{#each data.stats as stat (stat.name)}
					<tr>
						<th scope="row">{stat.label}</th>
						<td class="value">{stat.value}</td>
						<td class="bar" aria-hidden="true">
							<span class="track"><span class="fill" style:width="{Math.min(100, (stat.value / STAT_MAX) * 100)}%"></span></span>
						</td>
					</tr>
				{/each}
				<tr class="total">
					<th scope="row">Total</th>
					<td class="value">{total}</td>
					<td class="bar" aria-hidden="true">
						<span class="track"
							><span class="fill" style:width="{Math.min(100, (total / (STAT_MAX * Math.max(1, data.stats.length))) * 100)}%"
							></span></span
						>
					</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="panel" aria-labelledby="abilities-heading">
		<h2 id="abilities-heading">Abilities</h2>
		<ul class="bullets">
			{#each data.abilities as ability (ability.name)}
				<li>
					<a href="/abilities/{ability.name}">{ability.label}</a>{ability.hidden ? ' (hidden)' : ''}
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel" aria-labelledby="evolution-heading">
		<h2 id="evolution-heading">Evolution</h2>
		<ul class="bullets evolution">
			{@render evolution(data.evolution)}
		</ul>
	</section>

	<section class="panel" id="moves" aria-labelledby="moves-heading">
		<h2 id="moves-heading">Moves</h2>
		{#if data.games.length}
			<div class="game">
				<label for="game">Game</label>
				<select id="game" value={data.game} onchange={(event) => selectGame(event.currentTarget.value)}>
					{#each data.games as game (game.name)}
						<option value={game.name}>{game.label}</option>
					{/each}
				</select>
			</div>
			{#key data.game}
				<div class="tables">
					{#each data.moveTables as table (table.method)}
						<MovesTable caption={table.label} rows={table.rows} showLevel={table.method === 'level-up'} />
					{/each}
				</div>
			{/key}
		{:else}
			<p class="muted">This Pokémon doesn't learn any moves.</p>
		{/if}
	</section>
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: var(--artwork-size) 1fr;
		gap: var(--space-4) var(--space-6);
		align-items: start;
	}

	.artwork {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		aspect-ratio: 1;
		overflow: hidden;
	}

	.artwork img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.info {
		padding-top: var(--space-4);
	}

	.genus {
		margin-top: var(--space-1);
	}

	.types {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-3);
	}

	.measures {
		display: flex;
		gap: var(--space-6);
		margin-top: var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.flavor {
		margin-top: var(--space-4);
	}

	.stats {
		width: 100%;
		border-collapse: collapse;
	}

	.stats th {
		width: 6rem;
		text-align: left;
		font-weight: var(--weight-normal);
		color: var(--color-text-muted);
		padding: var(--space-1) 0;
	}

	.stats .value {
		width: 3rem;
		padding: var(--space-1) 0;
	}

	.stats .total th,
	.stats .total td {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-2);
	}

	.track {
		display: block;
		height: 0.5rem;
		border-radius: var(--radius-sm);
		background: var(--color-stat-track);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
	}

	.bullets {
		margin: 0;
		padding-left: var(--space-5);
	}

	.bullets.evolution {
		padding-left: var(--space-4);
	}

	.evolution :global(ul) {
		padding-left: var(--space-5);
	}

	.evolution a[aria-current='page'] {
		font-weight: var(--weight-semibold);
	}

	.game {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.game label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.game select {
		height: 2.5rem;
		min-width: 16.5rem;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.tables {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	@media (max-width: 40rem) {
		.summary {
			grid-template-columns: 1fr;
		}

		.artwork {
			width: var(--artwork-size);
			max-width: 100%;
			margin: 0 auto;
		}

		.info {
			padding-top: 0;
		}

		.game select {
			min-width: 0;
			width: 16.5rem;
			max-width: 100%;
		}
	}
</style>
