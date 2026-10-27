<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { orMissing } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1 class="page-title">{data.label}</h1>

<div class="stack">
	<dl class="panel facts">
		<div>
			<dt>Type</dt>
			<dd><TypeBadge type={data.type} link /></dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{orMissing(data.category)}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{orMissing(data.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{orMissing(data.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{orMissing(data.pp)}</dd>
		</div>
	</dl>

	<Section id="effect" title="Effect">
		<p>{orMissing(data.effect)}</p>
	</Section>

	<Section id="learned-by" title="Learned by">
		<p class="count">{data.cards.length} Pokémon</p>
		<CardList cards={data.cards} />
	</Section>
</div>

<style>
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		padding-block: var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
