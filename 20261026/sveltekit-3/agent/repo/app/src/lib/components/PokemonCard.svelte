<script lang="ts">
	import { dexNumber } from '../format.ts';
	import type { PokemonCard } from '../types.ts';
	import TypeList from './TypeList.svelte';

	let { card }: { card: PokemonCard } = $props();
</script>

<a class="card" href="/pokemon/{card.name}">
	<img src={card.sprite} alt="" width="96" height="96" loading="lazy" decoding="async" />
	<span class="dex">{dexNumber(card.id)}</span>
	<span class="name">{card.label}</span>
	{#if card.types?.length}
		<TypeList types={card.types} />
	{/if}
	{#if card.hidden}
		<span class="note">Hidden ability</span>
	{/if}
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		height: 100%;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		text-decoration: none;
		text-align: center;
	}

	.card:hover {
		border-color: var(--color-link);
	}

	.card:hover .name {
		text-decoration: underline;
	}

	img {
		width: var(--sprite-size);
		height: var(--sprite-size);
	}

	.dex {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}


	.note {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
