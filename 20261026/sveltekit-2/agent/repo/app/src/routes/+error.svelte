<script lang="ts">
	import { page } from '$app/state';

	const title = $derived(page.status === 404 ? 'Not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{title} – Pokédex</title>
</svelte:head>

<h1>{title}</h1>
{#if page.status !== 404}
	<p class="muted">The Pokédex couldn't load this page. Please try again.</p>
{/if}
<p><a href="/">Back to the Pokédex</a></p>

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	p + p {
		margin-top: var(--space-2);
	}
</style>
