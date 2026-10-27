<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import { orMissing } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1 class="page-title">{data.label}</h1>

<div class="stack">
	<Section id="effect" title="Effect">
		<p>{orMissing(data.effect)}</p>
	</Section>

	<Section id="pokemon" title="Pokémon">
		<p class="count">{data.cards.length} Pokémon</p>
		<CardList cards={data.cards} />
	</Section>
</div>
