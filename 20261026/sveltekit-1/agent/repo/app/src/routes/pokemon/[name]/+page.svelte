<script lang="ts">
	import { goto } from '$app/navigation';
	import MovesTable from '#lib/components/MovesTable.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeList from '#lib/components/TypeList.svelte';
	import { dexNumber, pageTitle } from '#lib/format.ts';
	import type { EvolutionNode } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const STAT_MAX = 255;
</script>

<svelte:head>
	<title>{pageTitle(data.name)}</title>
</svelte:head>

{#snippet evolution(nodes: EvolutionNode[])}
	<ul>
		{#each nodes as node (node.name)}
			<li>
				<a href="/pokemon/{node.name}">{node.label}</a>
				{#if node.children.length}
					{@render evolution(node.children)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="stack">
	<div class="summary">
		<div class="artwork">
			{#if data.artwork}
				<img src={data.artwork} alt={data.name} width="475" height="475" />
			{/if}
		</div>
		<div class="info">
			<p class="dex">{dexNumber(data.id)}</p>
			<h1>{data.name}</h1>
			{#if data.genus}
				<p class="genus">{data.genus}</p>
			{/if}
			<TypeList types={data.types} link />
			<dl class="measurements">
				<div>
					<dt>Height</dt>
					<dd>{data.height} m</dd>
				</div>
				<div>
					<dt>Weight</dt>
					<dd>{data.weight} kg</dd>
				</div>
			</dl>
			{#if data.flavorText}
				<p class="flavor">{data.flavorText}</p>
			{/if}
		</div>
	</div>

	<Section id="stats" title="Base stats">
		<table class="stats">
			<tbody>
				{#each data.stats as stat (stat.name)}
					<tr>
						<th scope="row">{stat.label}</th>
						<td class="value">{stat.value}</td>
						<td class="bar" aria-hidden="true">
							<span style:width="{Math.min(100, (stat.value / STAT_MAX) * 100)}%"></span>
						</td>
					</tr>
				{/each}
				<tr class="total">
					<th scope="row">Total</th>
					<td class="value">{data.total}</td>
					<td class="bar" aria-hidden="true">
						<span
							style:width="{Math.min(100, (data.total / (STAT_MAX * Math.max(1, data.stats.length))) * 100)}%"
						></span>
					</td>
				</tr>
			</tbody>
		</table>
	</Section>

	<Section id="abilities" title="Abilities">
		<ul>
			{#each data.abilities as ability (ability.name)}
				<li>
					<a href="/abilities/{ability.name}">{ability.label}</a>{ability.hidden ? ' (hidden)' : ''}
				</li>
			{/each}
		</ul>
	</Section>

	<Section id="evolution" title="Evolution">
		<div class="evolution">
			{@render evolution([data.evolution])}
		</div>
	</Section>

	<Section id="moves" title="Moves">
		{#if data.games.length}
			<div class="game">
				<label for="game">Game</label>
				<select
					id="game"
					class="control"
					onchange={(event) =>
						goto(`?game=${encodeURIComponent(event.currentTarget.value)}`, { reset: false })}
				>
					{#each data.games as game (game.name)}
						<option value={game.name} selected={game.name === data.game}>{game.label}</option>
					{/each}
				</select>
			</div>
			<div class="tables">
				{#each data.moveTables as table (`${data.game}/${table.method}`)}
					<MovesTable {table} />
				{/each}
			</div>
		{:else}
			<p class="muted">This Pokémon doesn't learn any moves.</p>
		{/if}
	</Section>
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: var(--artwork-size) 1fr;
		gap: var(--space-6);
		align-items: start;
	}

	.artwork {
		width: var(--artwork-size);
		height: var(--artwork-size);
		overflow: hidden;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.artwork img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding-top: var(--space-4);
	}

	.dex,
	.genus {
		color: var(--color-text-muted);
	}

	.genus {
		margin-top: var(--space-1);
	}

	.info > :global(.types) {
		margin-top: var(--space-3);
	}

	.measurements {
		display: flex;
		gap: var(--space-6);
		margin: var(--space-4) 0 0;
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	dd {
		margin: 0;
	}

	.flavor {
		margin-top: var(--space-4);
	}

	@media (max-width: 40rem) {
		.summary {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.artwork {
			justify-self: center;
		}

		.info {
			padding-top: 0;
		}
	}

	.stats {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.stats th {
		width: 6rem;
		padding: var(--space-1) 0;
		color: var(--color-text-muted);
		font-size: var(--text-base);
		font-weight: var(--weight-normal);
		text-align: left;
	}

	.stats .value {
		width: 3rem;
		padding: var(--space-1) 0;
		font-size: var(--text-base);
	}

	.stats .bar {
		position: relative;
	}

	.stats .bar::before,
	.stats .bar span {
		position: absolute;
		top: 50%;
		left: 0;
		height: 0.5rem;
		margin-top: -0.25rem;
		border-radius: var(--radius-pill);
	}

	.stats .bar::before {
		content: '';
		right: 0;
		background: var(--color-stat-track);
	}

	.stats .bar span {
		background: var(--color-stat-bar);
		border-radius: var(--radius-pill) 0 0 var(--radius-pill);
	}

	.stats .total > * {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-2);
	}

	.stats .total .bar::before,
	.stats .total .bar span {
		margin-top: calc(-0.25rem + var(--space-1));
	}

	ul {
		margin: 0;
		padding-left: var(--space-5);
	}

	.evolution > ul {
		padding-left: var(--space-4);
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
		width: 100%;
		max-width: 16.5rem;
	}

	.tables {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
</style>
