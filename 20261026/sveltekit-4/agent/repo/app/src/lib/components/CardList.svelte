<script lang="ts">
	import type { Card } from '../util.ts';
	import { dexNumber } from '../util.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { cards }: { cards: Card[] } = $props();
</script>

<ul class="cards">
	{#each cards as card (card.id)}
		<li>
			<a class="card" href="/pokemon/{card.name}">
				<img src={card.sprite} alt="" width="96" height="96" loading="lazy" />
				<span class="dex">{dexNumber(card.id)}</span>
				<span class="name">{card.label}</span>
				{#if card.types?.length}
					<span class="types">
						{#each card.types as type (type.name)}
							<TypeBadge {type} />
						{/each}
					</span>
				{/if}
				{#if card.hidden}
					<span class="hidden">Hidden ability</span>
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
		image-rendering: pixelated;
	}

	.dex {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.name {
		line-height: var(--leading-normal);
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
