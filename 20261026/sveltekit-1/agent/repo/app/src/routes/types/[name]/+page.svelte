<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeList from '#lib/components/TypeList.svelte';
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{pageTitle(data.name)}</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="stack">
	<Section id="damage-relations" title="Damage relations">
		<dl class="relations">
			{#each data.relations as relation (relation.label)}
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
		<ul class="moves">
			{#each data.moves as move (move.name)}
				<li><a href="/moves/{move.name}">{move.label}</a></li>
			{/each}
		</ul>
	</Section>
</div>

<style>
	h1 {
		margin-bottom: var(--space-5);
	}

	.relations {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		margin: 0;
	}

	@media (max-width: 40rem) {
		.relations {
			grid-template-columns: 1fr;
		}
	}

	dt {
		margin-bottom: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	dd {
		margin: 0;
		min-height: 1.5rem;
	}

	.moves {
		columns: 10rem 6;
		column-gap: var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.moves li {
		padding-block: var(--space-1);
		break-inside: avoid;
	}
</style>
