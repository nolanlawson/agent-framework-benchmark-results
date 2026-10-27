import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/build.js';
import { api } from '../../lib/api.js';
import { getTypeLabels, pokemonRefsToSpecies, typeLabel } from '../../lib/data.js';
import {
	EM_DASH,
	englishName,
	humanize,
	latestEnglishFlavorText,
	orDash,
	type Localized,
	type NamedRef,
} from '../../lib/format.js';
import { cardList, notFound, section, typeLink } from '../../lib/templates.js';

type Move = {
	name: string;
	names: Localized[];
	type: NamedRef;
	damage_class: NamedRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_entries: Array<{ short_effect: string; language: NamedRef }>;
	flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>;
	learned_by_pokemon: NamedRef[];
};

async function loadMove(name: string) {
	const move = await api<Move>(`move/${encodeURIComponent(name.toLowerCase())}/`);
	if (!move) return null;
	const [typeLabels, learnedBy] = await Promise.all([
		getTypeLabels(),
		pokemonRefsToSpecies(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
	]);
	const effect =
		move.effect_entries.find((e) => e.language.name === 'en')?.short_effect ??
		latestEnglishFlavorText(move.flavor_text_entries) ??
		EM_DASH;
	return {
		label: englishName(move.names, move.name),
		type: { name: move.type.name, label: typeLabel(typeLabels, move.type.name) },
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect,
		learnedBy: learnedBy.map(({ id, name, label }) => ({ id, name, label })),
	};
}

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null };
		const data = await loadMove(String(params.name ?? ''));
		if (!data) responseInit.status = 404;
		return { data };
	},

	document: (context) => document({ ...context, title: context.props.data?.label ?? 'Not found' }),

	template: ({ props: { data } }) => {
		if (!data) return notFound();
		return html`
			<h1>${data.label}</h1>
			<dl class="panel facts facts--panel">
				<div><dt>Type</dt><dd>${typeLink(data.type)}</dd></div>
				<div><dt>Category</dt><dd>${orDash(data.category)}</dd></div>
				<div><dt>Power</dt><dd>${orDash(data.power)}</dd></div>
				<div><dt>Accuracy</dt><dd>${orDash(data.accuracy)}</dd></div>
				<div><dt>PP</dt><dd>${orDash(data.pp)}</dd></div>
			</dl>
			${section('effect', 'Effect', html`<p>${data.effect}</p>`)}
			${section(
				'learned-by',
				'Learned by',
				html`<p class="count">${data.learnedBy.length} Pokémon</p>
					${cardList(data.learnedBy)}`,
			)}
		`;
	},
});
