<script lang="ts">
	import type { TypeRef } from '#lib/types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { types, link = false }: { types: TypeRef[]; link?: boolean } = $props();
</script>

<span class="types">
	{#each types as type (type.name)}
		<TypeBadge {type} {link} />
	{/each}
</span>

<style>
	.types {
		display: inline-flex;
		flex-wrap: wrap;
		justify-content: inherit;
		gap: var(--space-1);
	}
</style>
