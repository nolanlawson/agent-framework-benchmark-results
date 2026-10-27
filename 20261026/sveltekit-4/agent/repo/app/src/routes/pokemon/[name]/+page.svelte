<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { dexNumber, display } from '#lib/util.ts';
	import type { EvolutionNode } from './+page.server.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MAX_STAT = 255;
	const total = $derived(data.stats.reduce((sum, s) => sum + s.value, 0));

	function selectGame(game: string) {
		const url = new URL(page.url.href);
		url.searchParams.set('game', game);
		url.hash = '';
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

{#snippet evolutionList(nodes: EvolutionNode[])}
	<ul class="bullets">
		{#each nodes as node (node.name)}
			<li>
				<a href="/pokemon/{node.name}">{node.label}</a>
				{#if node.children.length}
					{@render evolutionList(node.children)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="hero">
	<div class="artwork">
		{#if data.artwork}
			<img src={data.artwork} alt={data.name} width="256" height="256" />
		{/if}
	</div>
	<div class="summary">
		<p class="dex">{dexNumber(data.id)}</p>
		<h1>{data.name}</h1>
		{#if data.genus}<p class="genus">{data.genus}</p>{/if}
		<p class="types">
			{#each data.types as type (type.name)}
				<TypeBadge {type} link />
			{/each}
		</p>
		<dl class="facts">
			<div>
				<dt>Height</dt>
				<dd>{(data.height / 10).toFixed(1)} m</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{(data.weight / 10).toFixed(1)} kg</dd>
			</div>
		</dl>
		{#if data.flavorText}<p class="flavor">{data.flavorText}</p>{/if}
	</div>
</div>

<section class="panel" aria-labelledby="stats-heading">
	<h2 id="stats-heading">Base stats</h2>
	<table class="stats">
		<tbody>
			{#each data.stats as stat (stat.name)}
				<tr>
					<th scope="row">{stat.label}</th>
					<td>{stat.value}</td>
					<td class="bar-cell" aria-hidden="true">
						<span class="bar"><span style:width="{Math.min(100, (stat.value / MAX_STAT) * 100)}%"></span></span>
					</td>
				</tr>
			{/each}
			<tr class="total">
				<th scope="row">Total</th>
				<td>{total}</td>
				<td class="bar-cell" aria-hidden="true">
					<span class="bar"
						><span style:width="{Math.min(100, (total / (MAX_STAT * Math.max(1, data.stats.length))) * 100)}%"
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
			<li><a href="/abilities/{ability.name}">{ability.label}</a>{#if ability.hidden}{' '}(hidden){/if}</li>
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
	<h2 id="evolution-heading">Evolution</h2>
	<div class="evolution">{@render evolutionList([data.evolution])}</div>
</section>

<section class="panel" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	{#if data.games.length}
		<form class="game" method="GET" onsubmit={(event) => event.preventDefault()}>
			<label for="game">Game</label>
			<select id="game" name="game" value={data.game} onchange={(event) => selectGame(event.currentTarget.value)}>
				{#each data.games as game (game.name)}
					<option value={game.name}>{game.label}</option>
				{/each}
			</select>
			<noscript><button type="submit">Show</button></noscript>
		</form>
		{#each data.moveTables as table (`${data.game}-${table.method}`)}
			<MoveTable caption={table.label} rows={table.rows} showLevel={table.method === 'level-up'} />
		{/each}
	{:else}
		<p>{display(null)}</p>
	{/if}
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: var(--artwork-size) 1fr;
		gap: var(--space-6);
		margin-bottom: var(--space-5);
	}

	.artwork {
		width: var(--artwork-size);
		height: var(--artwork-size);
		padding: var(--space-2);
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

	.summary {
		padding-top: 1.125rem;
	}

	.dex,
	.genus {
		color: var(--color-text-muted);
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

	.facts {
		margin-top: var(--space-4);
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
	}

	.stats th,
	.stats td {
		padding: var(--space-1) 0;
	}

	.stats td:nth-child(2) {
		width: 3rem;
	}

	.stats .total th,
	.stats .total td {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-2);
	}

	.bar {
		display: block;
		height: 0.5rem;
		background: var(--color-stat-track);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.bar > span {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
	}

	.evolution > :global(ul) {
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
		height: 2.5rem;
		min-width: 0;
		width: 16.5rem;
		max-width: 100%;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	@media (max-width: 40rem) {
		.hero {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.artwork {
			margin: 0 auto;
			max-width: 100%;
		}

		.summary {
			padding-top: 0;
		}
	}
</style>
