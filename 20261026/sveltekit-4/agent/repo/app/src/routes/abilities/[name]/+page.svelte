<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import { display } from '#lib/util.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1 class="page-title spaced">{data.name}</h1>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{display(data.effect)}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<CardList cards={data.cards} />
</section>
