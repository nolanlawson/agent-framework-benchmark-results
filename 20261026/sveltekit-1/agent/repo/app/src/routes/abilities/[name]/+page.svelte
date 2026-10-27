<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import { orDash, pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{pageTitle(data.name)}</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="stack">
	<Section id="effect" title="Effect">
		<p>{orDash(data.effect)}</p>
	</Section>

	<Section id="pokemon" title="Pokémon">
		<p class="count">{data.cards.length} Pokémon</p>
		<CardList cards={data.cards} />
	</Section>
</div>

<style>
	h1 {
		margin-bottom: var(--space-5);
	}
</style>
