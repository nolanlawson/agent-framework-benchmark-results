<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import Section from '#lib/components/Section.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { orDash, pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{pageTitle(data.name)}</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="stack">
	<dl class="panel facts">
		<div>
			<dt>Type</dt>
			<dd><TypeBadge type={data.type} link /></dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{orDash(data.category)}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{orDash(data.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{orDash(data.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{orDash(data.pp)}</dd>
		</div>
	</dl>

	<Section id="effect" title="Effect">
		<p>{orDash(data.effect)}</p>
	</Section>

	<Section id="learned-by" title="Learned by">
		<p class="count">{data.cards.length} Pokémon</p>
		<CardList cards={data.cards} />
	</Section>
</div>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		margin: 0;
		padding-block: var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	dd {
		margin: 0;
	}
</style>
