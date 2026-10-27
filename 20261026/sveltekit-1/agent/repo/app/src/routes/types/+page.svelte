<script lang="ts">
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{pageTitle('Types')}</title>
</svelte:head>

<h1>Types</h1>

<ul>
	{#each data.types as type (type.name)}
		<li>
			<a href="/types/{type.name}" style:--badge-bg="var(--type-{type.name})">{type.label}</a>
		</li>
	{/each}
</ul>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--badge-bg);
		color: var(--color-on-type);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
