<script lang="ts">
	import { untrack } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import CardList from '#lib/components/CardList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Filters = typeof data.filters;

	const SEARCH_DEBOUNCE_MS = 200;

	// The search box keeps its own state so typing isn't overwritten by the results of
	// an earlier keystroke arriving. It's resynced on navigations the user didn't type
	// (links, back/forward).
	let query = $state(untrack(() => data.filters.q));
	let timer: ReturnType<typeof setTimeout> | undefined;

	afterNavigate(({ type }) => {
		if (type !== 'goto') query = data.filters.q;
	});

	function hrefFor(filters: Filters, page = 1) {
		const params = new URLSearchParams();
		if (filters.q.trim()) params.set('q', filters.q.trim());
		if (filters.type) params.set('type', filters.type);
		if (filters.generation) params.set('generation', filters.generation);
		if (page > 1) params.set('page', String(page));
		const search = params.toString();
		return search ? `/?${search}` : '/';
	}

	function applyFilters(changes: Partial<Filters>, replace = false) {
		clearTimeout(timer);
		goto(hrefFor({ ...data.filters, q: query, ...changes }), { replace, reset: false });
	}

	function onSearchInput() {
		clearTimeout(timer);
		timer = setTimeout(() => applyFilters({}, true), SEARCH_DEBOUNCE_MS);
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1 class="page-title">Pokémon</h1>

<form
	class="filters"
	method="get"
	action="/"
	role="search"
	onsubmit={(event) => {
		event.preventDefault();
		applyFilters({});
	}}
>
	<div class="field search">
		<label for="search">Search</label>
		<input id="search" type="search" name="q" autocomplete="off" bind:value={query} oninput={onSearchInput} />
	</div>
	<div class="field">
		<label for="type">Type</label>
		<select
			id="type"
			name="type"
			value={data.filters.type}
			onchange={(event) => applyFilters({ type: event.currentTarget.value })}
		>
			<option value="">All types</option>
			{#each data.types as type (type.name)}
				<option value={type.name}>{type.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation">Generation</label>
		<select
			id="generation"
			name="generation"
			value={data.filters.generation}
			onchange={(event) => applyFilters({ generation: event.currentTarget.value })}
		>
			<option value="">All generations</option>
			{#each data.generations as generation (generation.name)}
				<option value={generation.name}>{generation.label}</option>
			{/each}
		</select>
	</div>
	<noscript><button type="submit">Apply</button></noscript>
</form>

<p class="count" aria-live="polite">{data.total} Pokémon</p>

{#if data.cards.length}
	<CardList cards={data.cards} />

	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}
			<a href={hrefFor(data.filters, data.page - 1)}>Previous page</a>
		{/if}
		<span>Page {data.page} of {data.totalPages}</span>
		{#if data.page < data.totalPages}
			<a href={hrefFor(data.filters, data.page + 1)}>Next page</a>
		{/if}
	</nav>
{:else}
	<p class="empty">No Pokémon found</p>
{/if}

<style>
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
		min-width: 0;
	}

	label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	input,
	select {
		width: 100%;
		height: 2.625rem;
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	select {
		height: 2.5rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: var(--space-5);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}

	.empty {
		padding: var(--space-6) 0;
		color: var(--color-text-muted);
		text-align: center;
	}

	@media (max-width: 40rem) {
		.filters {
			grid-template-columns: 1fr;
		}
	}
</style>
