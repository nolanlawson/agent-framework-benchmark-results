<script lang="ts">
	import type { Snippet } from 'svelte';

	let { id, title, children }: { id: string; title: string; children: Snippet } = $props();
</script>

<section class="panel" {id} aria-labelledby="{id}-heading">
	<h2 id="{id}-heading">{title}</h2>
	{@render children()}
</section>
