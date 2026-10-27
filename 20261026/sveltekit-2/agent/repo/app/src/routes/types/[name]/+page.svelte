<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title} – Pokédex</title>
</svelte:head>

<div class="stack">
	<h1>{data.title}</h1>

	<section class="panel" aria-labelledby="relations-heading">
		<h2 id="relations-heading">Damage relations</h2>
		<dl class="relations">
			{#each data.relations as relation (relation.term)}
				<div>
					<dt>{relation.term}</dt>
					<dd>
						{#each relation.types as type (type.name)}
							<TypeBadge name={type.name} label={type.label} link />
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
		<p class="count">{data.pokemon.length} Pokémon</p>
		{#if data.pokemon.length}
			<CardList cards={data.pokemon} />
		{/if}
	</section>

	<section class="panel" aria-labelledby="moves-heading">
		<h2 id="moves-heading">Moves</h2>
		<p class="count">{data.moves.length} moves</p>
		{#if data.moves.length}
			<ul class="moves">
				{#each data.moves as move (move.name)}
					<li><a href="/moves/{move.name}">{move.label}</a></li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.relations {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: var(--space-1) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-xs);
	}

	@media (max-width: 40rem) {
		.relations {
			grid-template-columns: 1fr;
		}
	}
</style>
