<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<header class="site-header">
	<div class="wrap bar">
		<a class="brand" href="/">Pokédex</a>
		<nav aria-label="Main">
			<ul>
				<li><a href="/">Pokémon</a></li>
				<li><a href="/types">Types</a></li>
			</ul>
		</nav>
	</div>
</header>

<main class="wrap">
	{@render children()}
</main>

<footer class="site-footer">
	<p class="wrap">
		Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
	</p>
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
		min-height: var(--header-height);
	}

	.site-header a {
		color: inherit;
		text-decoration: none;
	}

	.site-header a:hover {
		text-decoration: underline;
	}

	.site-header a:focus-visible {
		outline-color: var(--color-on-accent);
	}

	.brand {
		font-size: var(--text-lg);
	}

	ul {
		display: flex;
		gap: var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	main {
		flex: 1;
		padding-block: var(--space-5) var(--space-7);
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
		padding-block: var(--space-5);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}
</style>
