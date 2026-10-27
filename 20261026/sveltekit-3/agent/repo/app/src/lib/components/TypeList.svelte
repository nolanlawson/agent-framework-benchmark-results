<script lang="ts">
	import type { TypeTag } from '../types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { types, link = false }: { types: TypeTag[]; link?: boolean } = $props();
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
		gap: var(--space-1);
	}
</style>
