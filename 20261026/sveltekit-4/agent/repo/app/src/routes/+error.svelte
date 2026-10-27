<script lang="ts">
	import { page } from '$app/state';

	const title = $derived(page.status === 404 ? 'Not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{title} – Pokédex</title>
</svelte:head>

<h1 class="page-title">{title}</h1>
<p class="back"><a href="/">Back to the Pokédex</a></p>

<style>
	.back {
		margin-bottom: var(--space-4);
	}
</style>
