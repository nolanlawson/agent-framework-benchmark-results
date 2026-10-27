import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/build.js';
import { api } from '../../lib/api.js';
import { getTypeLabels, pokemonRefsToSpecies, typeLabel, type TypeDetail } from '../../lib/data.js';
import { englishName, humanize } from '../../lib/format.js';
import { cardList, notFound, section, typeLink } from '../../lib/templates.js';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from'],
] as const;

async function loadType(name: string) {
	const type = await api<TypeDetail>(`type/${encodeURIComponent(name.toLowerCase())}/`);
	if (!type) return null;
	const [typeLabels, pokemon] = await Promise.all([getTypeLabels(), pokemonRefsToSpecies(type.pokemon)]);
	return {
		label: englishName(type.names, type.name),
		relations: RELATIONS.map(([term, key]) => ({
			term,
			types: type.damage_relations[key].map((t) => ({ name: t.name, label: typeLabel(typeLabels, t.name) })),
		})),
		pokemon: pokemon.map(({ id, name, label }) => ({ id, name, label })),
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
	};
}

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null };
		const data = await loadType(String(params.name ?? ''));
		if (!data) responseInit.status = 404;
		return { data };
	},

	document: (context) => document({ ...context, title: context.props.data?.label ?? 'Not found' }),

	template: ({ props: { data } }) => {
		if (!data) return notFound();
		return html`
			<h1>${data.label}</h1>
			${section(
				'damage-relations',
				'Damage relations',
				html`
					<dl class="relations">
						${data.relations.map(
							(r) => html`
								<div>
									<dt>${r.term}</dt>
									<dd>${r.types.length ? html`<span class="type-list">${r.types.map(typeLink)}</span>` : 'None'}</dd>
								</div>
							`,
						)}
					</dl>
				`,
			)}
			${section(
				'pokemon',
				'Pokémon',
				html`<p class="count">${data.pokemon.length} Pokémon</p>
					${cardList(data.pokemon)}`,
			)}
			${section(
				'moves',
				'Moves',
				html`<p class="count">${data.moves.length} moves</p>
					<ul class="move-columns" role="list">
						${data.moves.map((m) => html`<li><a href=${`/moves/${m.name}`}>${m.label}</a></li>`)}
					</ul>`,
			)}
		`;
	},
});
