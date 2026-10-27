import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuildStep } from '../lib/api.js';
import { browse, stateFromParams } from '../lib/browse.js';
import { getSpeciesIndex } from '../lib/data.js';
import type { SpeciesIndex } from '../lib/types.js';
import { document } from '../document.js';
import { browseResults } from '../templates/components.js';

export default defineRoute({
	handler: async ({ url }) => {
		const state = stateFromParams(url.searchParams);
		const index: SpeciesIndex = isBuildStep()
			? { spriteBase: '', types: [], generations: [], species: [] }
			: await getSpeciesIndex();
		return { types: index.types, generations: index.generations, state, result: browse(index, state) };
	},

	document: (context) => document({ ...context, title: null }),

	template: ({ props: { types, generations, state, result } }) => html`
		<div class="page-heading"><h1>Pokémon</h1></div>

		<form class="filters" action="/" method="get" role="search" data-browse-form>
			<div class="field field-search">
				<label for="filter-q">Search</label>
				<input id="filter-q" type="search" name="q" value=${state.q} autocomplete="off" spellcheck="false" />
			</div>
			<div class="field">
				<label for="filter-type">Type</label>
				<select id="filter-type" name="type">
					<option value="">All types</option>
					${types.map(
						(type) => html`<option value=${type.name} ?selected=${type.name === state.type}>${type.label}</option>`,
					)}
				</select>
			</div>
			<div class="field">
				<label for="filter-generation">Generation</label>
				<select id="filter-generation" name="generation">
					<option value="">All generations</option>
					${generations.map(
						(generation) =>
							html`<option value=${generation.name} ?selected=${generation.name === state.generation}>${generation.label}</option>`,
					)}
				</select>
			</div>
		</form>

		<div class="browse-results" data-browse-results>${browseResults(result)}</div>
	`,
});
