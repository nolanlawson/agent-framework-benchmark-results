import { homeUrl } from '../lib/home-url.js';

/**
 * Progressive enhancement for the Pokémon list filters: applies them as the user types
 * or picks an option, keeps them in the URL and swaps in the server-rendered results.
 */
class PokemonFilters extends HTMLElement {
	#timer: ReturnType<typeof setTimeout> | undefined;
	#controller: AbortController | undefined;

	connectedCallback() {
		const form = this.querySelector('form');
		if (!form) return;

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			this.#apply('replace');
		});
		form.addEventListener('input', (event) => {
			if ((event.target as HTMLElement).matches('input[type="search"]')) {
				clearTimeout(this.#timer);
				this.#timer = setTimeout(() => this.#apply('replace'), 150);
			}
		});
		form.addEventListener('change', (event) => {
			if ((event.target as HTMLElement).matches('select')) this.#apply('push');
		});
		window.addEventListener('popstate', () => {
			this.#syncControls();
			void this.#load(location.href);
		});
	}

	#form() {
		return this.querySelector('form')!;
	}

	#apply(mode: 'push' | 'replace') {
		clearTimeout(this.#timer);
		const data = new FormData(this.#form());
		const url = homeUrl({
			q: String(data.get('q') ?? '').trim() ? String(data.get('q')) : '',
			type: String(data.get('type') ?? ''),
			generation: String(data.get('generation') ?? ''),
			page: 1,
		});
		if (url === location.pathname + location.search) return;
		history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
		void this.#load(url);
	}

	#syncControls() {
		const params = new URLSearchParams(location.search);
		const form = this.#form();
		for (const name of ['q', 'type', 'generation']) {
			const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
			if (control) control.value = params.get(name) ?? '';
		}
	}

	async #load(url: string) {
		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		try {
			const res = await fetch(url, { signal: controller.signal });
			const text = await res.text();
			if (controller.signal.aborted) return;
			const doc = new DOMParser().parseFromString(text, 'text/html');
			const next = doc.getElementById('results');
			const current = document.getElementById('results');
			if (next && current) current.replaceWith(document.importNode(next, true));
		} catch (error) {
			if ((error as Error).name !== 'AbortError') location.assign(url);
		}
	}
}

customElements.define('pokemon-filters', PokemonFilters);
