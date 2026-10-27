<script lang="ts">
	import { dexNumber } from '#lib/format.ts';
	import type { CardData } from '#lib/types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { card }: { card: CardData } = $props();
</script>

<a class="card" href="/pokemon/{card.name}">
	<img src={card.sprite} alt="" width="96" height="96" loading="lazy" decoding="async" />
	<span class="dex">{dexNumber(card.id)}</span>
	<span class="name">{card.label}</span>
	{#if card.types?.length}
		<span class="types">
			{#each card.types as [name, label] (name)}
				<TypeBadge {name} {label} />
			{/each}
		</span>
	{/if}
	{#if card.hidden}
		<span class="hidden">Hidden ability</span>
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

	.types {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1);
	}

	.hidden {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
