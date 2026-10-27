<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="types">
	{#each data.types as type (type.name)}
		<li><a href="/types/{type.name}" style:background="var(--type-{type.name})">{type.label}</a></li>
	{/each}
</ul>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	.types {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: block;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-on-type);
		text-align: center;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
