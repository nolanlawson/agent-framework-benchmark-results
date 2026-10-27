<script lang="ts">
	import '#lib/tokens.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header">
	<div class="container bar">
		<a class="brand" href="/">Pokédex</a>
		<nav aria-label="Main">
			<a href="/">Pokémon</a>
			<a href="/types">Types</a>
		</nav>
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<footer class="site-footer">
	<p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>

<style>
	.site-header {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		height: var(--header-height);
	}

	.site-header a {
		color: inherit;
		text-decoration: none;
	}

	.site-header a:hover {
		text-decoration: underline;
	}

	.brand {
		font-size: var(--text-lg);
	}

	nav {
		display: flex;
		gap: var(--space-5);
	}

	main {
		padding-top: var(--space-5);
		padding-bottom: var(--space-7);
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
		padding: var(--space-5) 0;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}
</style>
