<script lang="ts">
	import CardList from '#lib/components/CardList.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { DASH, display } from '#lib/util.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1 class="page-title">{data.name}</h1>

<div class="panel details">
	<dl class="facts">
		<div>
			<dt>Type</dt>
			<dd>{#if data.type}<TypeBadge type={data.type} link />{:else}{DASH}{/if}</dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{display(data.category)}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{display(data.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{display(data.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{display(data.pp)}</dd>
		</div>
	</dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{display(data.effect)}</p>
</section>

<section class="panel" aria-labelledby="learned-heading">
	<h2 id="learned-heading">Learned by</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<CardList cards={data.cards} />
</section>

<style>
	.details {
		padding: var(--space-4);
	}
</style>
