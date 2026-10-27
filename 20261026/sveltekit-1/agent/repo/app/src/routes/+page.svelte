<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import CardList from '#lib/components/CardList.svelte';
	import { pageTitle } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The search box is edited locally and pushed to the URL after a short pause. It only
	// follows the URL when the navigation came from elsewhere (links, back/forward).
	let query = $state(initialQuery());
	let timer: ReturnType<typeof setTimeout> | undefined;

	function initialQuery() {
		return data.q;
	}

	afterNavigate((navigation) => {
		if (navigation.type !== 'goto') query = data.q;
	});

	interface Filters {
		q: string;
		type: string;
		generation: string;
		page: number;
	}

	function href({ q, type, generation, page }: Filters): string {
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q);
		if (type) params.set('type', type);
		if (generation) params.set('generation', generation);
		if (page > 1) params.set('page', String(page));
		const search = params.toString();
		return search ? `/?${search}` : '/';
	}

	function current(): Filters {
		return { q: query, type: data.type, generation: data.generation, page: data.page };
	}

	function applyFilters(changes: Partial<Filters>, replace: boolean) {
		clearTimeout(timer);
		goto(href({ ...current(), ...changes, page: 1 }), { replace, reset: false });
	}

	function onSearchInput() {
		clearTimeout(timer);
		timer = setTimeout(() => applyFilters({}, true), 200);
	}
</script>

<svelte:head>
	<title>{pageTitle()}</title>
</svelte:head>

<h1>Pokémon</h1>

<form
	class="filters"
	role="search"
	method="get"
	action="/"
	onsubmit={(event) => {
		event.preventDefault();
		applyFilters({}, false);
	}}
>
	<div class="field search">
		<label for="search">Search</label>
		<input
			id="search"
			class="control"
			type="search"
			name="q"
			autocomplete="off"
			spellcheck="false"
			value={query}
			oninput={(event) => {
				query = event.currentTarget.value;
				onSearchInput();
			}}
		/>
	</div>
	<div class="field">
		<label for="type">Type</label>
		<select
			id="type"
			class="control"
			name="type"
			onchange={(event) => applyFilters({ type: event.currentTarget.value }, false)}
		>
			<option value="" selected={data.type === ''}>All types</option>
			{#each data.typeOptions as option (option.name)}
				<option value={option.name} selected={data.type === option.name}>{option.label}</option>
			{/each}
		</select>
	</div>
	<div class="field">
		<label for="generation">Generation</label>
		<select
			id="generation"
			class="control"
			name="generation"
			onchange={(event) => applyFilters({ generation: event.currentTarget.value }, false)}
		>
			<option value="" selected={data.generation === ''}>All generations</option>
			{#each data.generationOptions as option (option.name)}
				<option value={option.name} selected={data.generation === option.name}>{option.label}</option>
			{/each}
		</select>
	</div>
</form>

<p class="count">{data.count} Pokémon</p>

{#if data.count === 0}
	<p class="empty">No Pokémon found</p>
{:else}
	<CardList cards={data.cards} />

	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}
			<a href={href({ ...current(), page: data.page - 1 })} rel="prev">Previous page</a>
		{/if}
		<span>Page {data.page} of {data.totalPages}</span>
		{#if data.page < data.totalPages}
			<a href={href({ ...current(), page: data.page + 1 })} rel="next">Next page</a>
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

	.search input {
		width: 100%;
	}

	@media (max-width: 40rem) {
		.filters {
			grid-template-columns: 1fr;
		}
	}

	.empty {
		padding-block: var(--space-6);
		text-align: center;
		color: var(--color-text-muted);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-5);
		margin-top: var(--space-5);
		font-size: var(--text-sm);
	}
</style>
