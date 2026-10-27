<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1 class="page-title">Types</h1>

<ul class="types">
	{#each data.types as type (type.name)}
		<li><a href="/types/{type.name}" style:--tile-bg="var(--type-{type.name})">{type.label}</a></li>
	{/each}
</ul>

<style>
	.types {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 2.5rem;
		padding: 0 var(--space-3);
		border-radius: var(--radius-md);
		background: var(--tile-bg);
		color: var(--color-on-type);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
