<script lang="ts">
	import { dexNumber } from '#lib/format.ts';
	import type { Card } from '#lib/types.ts';
	import TypeList from './TypeList.svelte';

	let { cards }: { cards: Card[] } = $props();
</script>

<ul class="cards">
	{#each cards as card (card.id)}
		<li>
			<a href="/pokemon/{card.name}">
				<img src={card.sprite} alt="" width="96" height="96" loading="lazy" />
				<span class="dex">{dexNumber(card.id)}</span>
				<span class="name">{card.label}</span>
				{#if card.types}
					<TypeList types={card.types} />
				{/if}
				{#if card.hidden}
					<span class="hidden-ability">Hidden ability</span>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: var(--space-1);
		height: 100%;
		padding: var(--space-3) var(--space-2);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		text-align: center;
		text-decoration: none;
	}

	a:hover {
		border-color: var(--color-link);
	}

	a:hover .name {
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

	.hidden-ability {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
