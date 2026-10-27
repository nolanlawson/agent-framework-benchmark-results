<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import CardList from '#lib/components/CardList.svelte';
	import { listUrl, type Filters } from '#lib/filters.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The search box keeps its own state so results arriving for an earlier keystroke
	// don't overwrite what the user has typed since.
	let q = $state(page.url.searchParams.get('q') ?? '');
	let timer: ReturnType<typeof setTimeout> | undefined;

	afterNavigate(({ type }) => {
		if (type !== 'goto') q = page.url.searchParams.get('q') ?? '';
	});

	function apply(changes: Partial<Filters>) {
		clearTimeout(timer);
		const filters = { ...data.filters, q, ...changes };
		goto(listUrl(filters), { replace: true, reset: false });
	}

	function onSearchInput() {
		clearTimeout(timer);
		timer = setTimeout(() => apply({}), 200);
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokémon</h1>

<form
	class="filters"
	method="GET"
	action="/"
	role="search"
	onsubmit={(event) => {
		event.preventDefault();
		apply({});
	}}
>
	<div class="field search">
		<label for="search">Search</label>
		<input id="search" type="search" name="q" autocomplete="off" bind:value={q} oninput={onSearchInput} />
	</div>
	<div class="field">
		<label for="type">Type</label>
		<select
			id="type"
			name="type"
			value={data.filters.type}
			onchange={(event) => apply({ type: event.currentTarget.value })}
		>
			<option value="">All types</option>
			{#each data.typeOptions as option (option.name)}
				<option value={option.name}>{option.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation">Generation</label>
		<select
			id="generation"
			name="generation"
			value={data.filters.generation}
			onchange={(event) => apply({ generation: event.currentTarget.value })}
		>
			<option value="">All generations</option>
			{#each data.generationOptions as option (option.name)}
				<option value={option.name}>{option.label}</option>
			{/each}
		</select>
	</div>
</form>

{#if data.count === 0}
	<p class="count">No Pokémon found</p>
{:else}
	<p class="count">{data.count} Pokémon</p>
	<CardList cards={data.cards} />
	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}
			<a href={listUrl(data.filters, data.page - 1)}>Previous page</a>
		{/if}
		<span>Page {data.page} of {data.totalPages}</span>
		{#if data.page < data.totalPages}
			<a href={listUrl(data.filters, data.page + 1)}>Next page</a>
		{/if}
	</nav>
{/if}

<style>
	h1 {
		margin-bottom: var(--space-4);
	}

	.filters {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	input,
	select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	select {
		height: 2.5rem;
		padding-block: 0;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-5);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}

	@media (max-width: 40rem) {
		.filters {
			grid-template-columns: 1fr;
		}
	}
</style>
