<script lang="ts">
	import { page } from '$app/state';
	import { pageTitle } from '#lib/format.ts';

	const heading = $derived(page.status === 404 ? 'Not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{pageTitle(heading)}</title>
</svelte:head>

<h1>{heading}</h1>

{#if page.status !== 404 && page.error?.message}
	<p class="muted">{page.error.message}</p>
{/if}

<p><a href="/">Back to the Pokédex</a></p>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	p {
		margin-bottom: var(--space-4);
	}
</style>
