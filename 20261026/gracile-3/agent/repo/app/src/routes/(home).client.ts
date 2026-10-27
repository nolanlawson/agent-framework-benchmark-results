// Live filtering for the Pokémon list: the server renders the first view, then the
// browser filters the species index as the controls change, re-rendering with the same
// Lit templates.

import { render } from 'lit';

import { browse, type BrowseState, stateFromParams, stateToSearch } from '../lib/browse.js';
import type { SpeciesIndex } from '../lib/types.js';
import { browseResults } from '../templates/components.js';

const SEARCH_DEBOUNCE_MS = 150;

const form = document.querySelector<HTMLFormElement>('[data-browse-form]');
const results = document.querySelector<HTMLElement>('[data-browse-results]');

if (form && results) {
	const search = form.elements.namedItem('q') as HTMLInputElement;
	const type = form.elements.namedItem('type') as HTMLSelectElement;
	const generation = form.elements.namedItem('generation') as HTMLSelectElement;

	let index: Promise<SpeciesIndex> | null = null;
	const loadIndex = () =>
		(index ??= fetch('/api/species-index').then((response) => {
			if (!response.ok) throw new Error(`Species index: ${response.status}`);
			return response.json() as Promise<SpeciesIndex>;
		})).catch((error: unknown) => {
			index = null;
			throw error;
		});

	let cleared = false;
	let latest = 0;
	const show = async (state: BrowseState) => {
		const ticket = ++latest;
		let data: SpeciesIndex;
		try {
			data = await loadIndex();
		} catch {
			// Fall back to a server-rendered page.
			location.assign(`/${stateToSearch(state)}`);
			return;
		}
		if (ticket !== latest) return;
		if (!cleared) {
			// Hand the server-rendered markup over to Lit.
			results.replaceChildren();
			cleared = true;
		}
		render(browseResults(browse(data, state)), results);
	};

	const controlsState = (): BrowseState => ({
		q: search.value,
		type: type.value,
		generation: generation.value,
		page: 1,
	});

	const apply = (mode: 'push' | 'replace') => {
		const state = controlsState();
		const url = `/${stateToSearch(state)}`;
		if (url !== location.pathname + location.search) {
			history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
		}
		void show(state);
	};

	let timer: ReturnType<typeof setTimeout> | undefined;
	search.addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(() => apply('replace'), SEARCH_DEBOUNCE_MS);
	});
	type.addEventListener('change', () => apply('push'));
	generation.addEventListener('change', () => apply('push'));
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		clearTimeout(timer);
		apply('replace');
	});

	window.addEventListener('popstate', () => {
		const state = stateFromParams(new URLSearchParams(location.search));
		search.value = state.q;
		type.value = state.type;
		generation.value = state.generation;
		void show(state);
	});

	// Catch up with anything typed before this script ran, then warm the index.
	const initial = stateFromParams(new URLSearchParams(location.search));
	if (search.value !== initial.q || type.value !== initial.type || generation.value !== initial.generation) {
		apply('replace');
	} else {
		void loadIndex().catch(() => {});
	}
}
