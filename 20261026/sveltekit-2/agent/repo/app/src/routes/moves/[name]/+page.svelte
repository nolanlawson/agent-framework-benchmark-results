<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { orMissing } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title} – Pokédex</title>
</svelte:head>

<div class="stack">
	<div>
		<h1>{data.title}</h1>
		<dl class="panel facts">
			<div>
				<dt>Type</dt>
				<dd><TypeBadge name={data.type.name} label={data.type.label} link /></dd>
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
	</div>

	<section class="panel" aria-labelledby="effect-heading">
		<h2 id="effect-heading">Effect</h2>
		<p>{orMissing(data.effect)}</p>
	</section>

	<section class="panel" aria-labelledby="learned-heading">
		<h2 id="learned-heading">Learned by</h2>
		<p class="count">{data.learnedBy.length} Pokémon</p>
		{#if data.learnedBy.length}
			<CardList cards={data.learnedBy} />
		{/if}
	</section>
</div>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		padding: var(--space-4);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
