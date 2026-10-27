<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeList from '#lib/components/TypeList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1 class="page-title">{data.label}</h1>

<div class="stack">
	<Section id="damage-relations" title="Damage relations">
		<dl class="relations">
			{#each data.relations as relation (relation.key)}
				<div>
					<dt>{relation.label}</dt>
					<dd>
						{#if relation.types.length}
							<TypeList types={relation.types} link />
						{:else}
							None
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</Section>

	<Section id="pokemon" title="Pokémon">
		<p class="count">{data.cards.length} Pokémon</p>
		<CardList cards={data.cards} />
	</Section>

	<Section id="moves" title="Moves">
		<p class="count">{data.moves.length} moves</p>
		<ul class="plain-list moves">
			{#each data.moves as move (move.name)}
				<li><a href="/moves/{move.name}">{move.label}</a></li>
			{/each}
		</ul>
	</Section>
</div>

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

	.moves {
		columns: 10rem;
		column-gap: var(--space-4);
		font-size: var(--text-sm);
	}

	.moves li {
		break-inside: avoid;
		padding-bottom: var(--space-2);
	}

	@media (max-width: 40rem) {
		.relations {
			grid-template-columns: 1fr;
		}
	}
</style>
