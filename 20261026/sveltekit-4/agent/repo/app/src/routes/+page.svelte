<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import CardList from '#lib/components/CardList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initialQuery = () => data.q;
	// The search box keeps its own value while the user types, so results arriving for an
	// older query never overwrite newer keystrokes. Other navigations (links, back/forward)
	// sync it from the URL.
	let q = $state(initialQuery());
	let timer: ReturnType<typeof setTimeout> | undefined;

	afterNavigate((navigation) => {
		if (navigation.type !== 'goto') q = data.q;
	});

	function href(params: { q?: string; type?: string; generation?: string; page?: number }) {
		const search = new URLSearchParams();
		if (params.q?.trim()) search.set('q', params.q.trim());
		if (params.type) search.set('type', params.type);
		if (params.generation) search.set('generation', params.generation);
		if (params.page && params.page > 1) search.set('page', String(params.page));
		const query = search.toString();
		return query ? `/?${query}` : '/';
	}

	function filtersHref(form: HTMLFormElement) {
		const values = new FormData(form);
		return href({
			q: String(values.get('q') ?? ''),
			type: String(values.get('type') ?? ''),
			generation: String(values.get('generation') ?? '')
		});
	}

	function apply(form: HTMLFormElement, replace: boolean) {
		clearTimeout(timer);
		goto(filtersHref(form), { replace, reset: false });
	}

	function onSearchInput(event: Event & { currentTarget: HTMLInputElement }) {
		const form = event.currentTarget.form!;
		clearTimeout(timer);
		timer = setTimeout(() => apply(form, true), 150);
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1 class="page-title">Pokémon</h1>

<form
	class="filters"
	method="GET"
	action="/"
	onsubmit={(event) => {
		event.preventDefault();
		apply(event.currentTarget, false);
	}}
>
	<div class="field search">
		<label for="search">Search</label>
		<input id="search" type="search" name="q" autocomplete="off" bind:value={q} oninput={onSearchInput} />
	</div>
	<div class="field">
		<label for="type">Type</label>
		<select id="type" name="type" value={data.type} onchange={(event) => apply(event.currentTarget.form!, false)}>
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
			value={data.generation}
			onchange={(event) => apply(event.currentTarget.form!, false)}
		>
			<option value="">All generations</option>
			{#each data.generations as generation (generation.name)}
				<option value={generation.name}>{generation.label}</option>
			{/each}
		</select>
	</div>
</form>

{#if data.total > 0}
	<p class="count">{data.total} Pokémon</p>
	<CardList cards={data.cards} />
	<nav class="pagination" aria-label="Pagination">
		{#if data.page > 1}
			<a href={href({ ...data, page: data.page - 1 })}>Previous page</a>
		{/if}
		<span>Page {data.page} of {data.pageCount}</span>
		{#if data.page < data.pageCount}
			<a href={href({ ...data, page: data.page + 1 })}>Next page</a>
		{/if}
	</nav>
{:else}
	<p class="count">No Pokémon found</p>
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: var(--space-3);
		margin-bottom: 1.125rem;
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
		height: 2.5rem;
		width: 100%;
		padding: 0 var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	select {
		padding: 0 var(--space-3);
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
