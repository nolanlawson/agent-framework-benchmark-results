<script lang="ts">
	let { name, label, link = false }: { name: string; label: string; link?: boolean } = $props();
</script>

{#if link}
	<a class="badge" href="/types/{name}" style:background="var(--type-{name}, var(--color-text-muted))">{label}</a>
{:else}
	<span class="badge" style:background="var(--type-{name}, var(--color-text-muted))">{label}</span>
{/if}

<style>
	.badge {
		display: inline-block;
		padding: 0.1875rem var(--space-2);
		border-radius: var(--radius-pill);
		color: var(--color-on-type);
		font-size: var(--text-xs);
		line-height: var(--leading-normal);
		text-decoration: none;
		white-space: nowrap;
	}

	a.badge:hover {
		text-decoration: underline;
	}
</style>
