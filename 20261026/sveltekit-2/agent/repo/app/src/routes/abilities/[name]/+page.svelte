<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import { orMissing } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title} – Pokédex</title>
</svelte:head>

<div class="stack">
	<h1>{data.title}</h1>

	<section class="panel" aria-labelledby="effect-heading">
		<h2 id="effect-heading">Effect</h2>
		<p>{orMissing(data.effect)}</p>
	</section>

	<section class="panel" aria-labelledby="pokemon-heading">
		<h2 id="pokemon-heading">Pokémon</h2>
		<p class="count">{data.pokemon.length} Pokémon</p>
		{#if data.pokemon.length}
			<CardList cards={data.pokemon} />
		{/if}
	</section>
</div>
