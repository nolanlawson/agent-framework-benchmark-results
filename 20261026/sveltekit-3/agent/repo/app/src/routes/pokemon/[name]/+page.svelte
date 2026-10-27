<script lang="ts">
	import { goto } from '$app/navigation';
	import MovesTable from '#lib/components/MovesTable.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeList from '#lib/components/TypeList.svelte';
	import { dexNumber } from '#lib/format.ts';
	import type { EvolutionNode } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MAX_STAT = 255;

	const total = $derived(data.stats.reduce((sum, s) => sum + s.value, 0));

	function selectGame(game: string) {
		goto(`/pokemon/${data.name}?game=${encodeURIComponent(game)}`, { reset: false });
	}
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

{#snippet bar(value: number, max: number)}
	<span class="bar"><span style:width="{Math.min(100, (value / max) * 100)}%"></span></span>
{/snippet}

{#snippet evolution(node: EvolutionNode)}
	<li>
		<a href="/pokemon/{node.name}" aria-current={node.name === data.name ? 'page' : undefined}>{node.label}</a>
		{#if node.evolvesTo.length}
			<ul>
				{#each node.evolvesTo as next (next.name)}
					{@render evolution(next)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<div class="summary">
	<div class="artwork">
		{#if data.artwork}
			<img src={data.artwork} alt={data.label} width="288" height="288" />
		{/if}
	</div>
	<div class="info">
		<p class="dex">{dexNumber(data.id)}</p>
		<h1>{data.label}</h1>
		{#if data.genus}<p class="genus">{data.genus}</p>{/if}
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
		{#if data.flavorText}<p class="flavor">{data.flavorText}</p>{/if}
	</div>
</div>

<div class="stack">
	<Section id="stats" title="Base stats">
		<table class="stats">
			<tbody>
				{#each data.stats as stat (stat.name)}
					<tr>
						<th scope="row">{stat.label}</th>
						<td class="value">{stat.value}</td>
						<td class="meter" aria-hidden="true">{@render bar(stat.value, MAX_STAT)}</td>
					</tr>
				{/each}
				<tr class="total">
					<th scope="row">Total</th>
					<td class="value">{total}</td>
					<td class="meter" aria-hidden="true">{@render bar(total, MAX_STAT * data.stats.length)}</td>
				</tr>
			</tbody>
		</table>
	</Section>

	<Section id="abilities" title="Abilities">
		<ul class="bullet-list">
			{#each data.abilities as ability (ability.name)}
				<li>
					<a href="/abilities/{ability.name}">{ability.label}</a>{#if ability.hidden}{' '}(hidden){/if}
				</li>
			{/each}
		</ul>
	</Section>

	<Section id="evolution" title="Evolution">
		<ul class="bullet-list evolution">
			{@render evolution(data.evolution)}
		</ul>
	</Section>

	<Section id="moves" title="Moves">
		{#if data.games.length}
			<div class="game">
				<label for="game">Game</label>
				<select id="game" value={data.game} onchange={(event) => selectGame(event.currentTarget.value)}>
					{#each data.games as game (game.name)}
						<option value={game.name}>{game.label}</option>
					{/each}
				</select>
			</div>
			<div class="tables">
				{#each data.moveTables as table (`${data.game}:${table.method}`)}
					<MovesTable {table} />
				{/each}
			</div>
		{:else}
			<p>This Pokémon doesn't learn any moves.</p>
		{/if}
	</Section>
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: var(--artwork-size) 1fr;
		gap: var(--space-6);
		align-items: start;
		margin-bottom: var(--space-5);
	}

	.artwork {
		aspect-ratio: 1;
		width: 100%;
		max-width: var(--artwork-size);
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
		margin-bottom: var(--space-3);
	}

	.measurements {
		display: flex;
		gap: var(--space-5);
		margin-top: var(--space-4);
	}

	.measurements dt {
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
		padding: var(--space-1) 0;
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
		text-align: left;
		white-space: nowrap;
	}

	.stats .value {
		width: 3rem;
		padding: var(--space-1) 0;
	}

	.stats .meter {
		padding: var(--space-1) 0;
	}

	.stats .total > * {
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

	.bar span {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
	}

	.evolution ul {
		padding-left: var(--space-5);
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
		min-width: 16.5rem;
		height: 2.5rem;
		padding: var(--space-2) var(--space-3);
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
			gap: var(--space-4);
		}

		.artwork {
			justify-self: center;
		}

		.info {
			padding-top: 0;
		}
	}
</style>
