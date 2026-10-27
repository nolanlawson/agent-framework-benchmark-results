<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1 class="page-title spaced">{data.name}</h1>

<section class="panel" aria-labelledby="relations-heading">
	<h2 id="relations-heading">Damage relations</h2>
	<dl class="relations">
		{#each data.relations as relation (relation.label)}
			<div>
				<dt>{relation.label}</dt>
				<dd>
					{#each relation.types as type (type.name)}
						<TypeBadge {type} link />
					{:else}
						None
					{/each}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<CardList cards={data.cards} />
</section>

<section class="panel" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<p class="count">{data.moves.length} moves</p>
	<ul class="moves">
		{#each data.moves as move (move.name)}
			<li><a href="/moves/{move.name}">{move.label}</a></li>
		{/each}
	</ul>
</section>

<style>
	.relations {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3) var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-1);
	}

	dd {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.moves {
		columns: 10rem auto;
		column-gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.moves li {
		break-inside: avoid;
		padding: var(--space-1) 0;
	}

	@media (max-width: 40rem) {
		.relations {
			grid-template-columns: 1fr;
		}
	}
</style>
