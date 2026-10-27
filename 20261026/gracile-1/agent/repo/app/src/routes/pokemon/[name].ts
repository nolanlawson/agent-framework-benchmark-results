import '../../components/pokemon-moves.js';

import { defineRoute } from '@gracile/gracile/route';
import { html, type TemplateResult } from 'lit';

import { isBuilding } from '../../lib/api.js';
import { document } from '../../document.js';
import { pokemonPage, type EvolutionNode } from '../../lib/data.js';
import { dexNumber } from '../../lib/format.js';
import { notFound, section, typeBadges } from '../../templates/partials.js';

/** Bars are scaled to the highest possible base stat. */
const MAX_STAT = 255;

function evolutionList(nodes: EvolutionNode[]): TemplateResult {
	return html`<ul>
		${nodes.map(
			(node) => html`<li>
				<a href="/pokemon/${node.name}">${node.label}</a>
				${node.children.length ? evolutionList(node.children) : ''}
			</li>`,
		)}
	</ul>`;
}

function bar(value: number, max: number): TemplateResult {
	const percent = Math.min(100, (value / max) * 100).toFixed(1);
	return html`<div class="bar"><span style="width: ${percent}%"></span></div>`;
}

export default defineRoute({
	handler: {
		GET: async ({ params, url, responseInit }) => {
			if (isBuilding()) return { pokemon: null, game: '' };
			const pokemon = await pokemonPage(params.name ?? '');
			if (!pokemon) responseInit.status = 404;
			return { pokemon, game: url.searchParams.get('game') ?? '' };
		},
	},

	document: ({ props }) => document({ title: props.GET.pokemon?.label ?? 'Not found' }),

	template: ({ props: { GET } }) => {
		const p = GET.pokemon;
		if (!p) return notFound();
		return html`
			<div class="pokemon-summary">
				<img class="artwork" src=${p.artwork} alt=${p.label} width="288" height="288" />
				<div class="pokemon-info">
					<p class="dex">${dexNumber(p.id)}</p>
					<h1>${p.label}</h1>
					${p.genus ? html`<p class="genus">${p.genus}</p>` : ''}
					${typeBadges(p.types)}
					<dl class="facts">
						<div><dt>Height</dt><dd>${p.height} m</dd></div>
						<div><dt>Weight</dt><dd>${p.weight} kg</dd></div>
					</dl>
					${p.flavorText ? html`<p class="flavor">${p.flavorText}</p>` : ''}
				</div>
			</div>

			${section(
				'stats',
				'Base stats',
				html`<table class="stats">
					<tbody>
						${p.stats.map(
							(s) => html`<tr>
								<th scope="row">${s.label}</th>
								<td>${s.value}</td>
								<td>${bar(s.value, MAX_STAT)}</td>
							</tr>`,
						)}
						<tr class="total">
							<th scope="row">Total</th>
							<td>${p.total}</td>
							<td>${bar(p.total, MAX_STAT * Math.max(1, p.stats.length))}</td>
						</tr>
					</tbody>
				</table>`,
			)}
			${section(
				'abilities',
				'Abilities',
				html`<ul>
					${p.abilities.map(
						(a) => html`<li><a href="/abilities/${a.name}">${a.label}</a>${a.hidden ? ' (hidden)' : ''}</li>`,
					)}
				</ul>`,
			)}
			${section('evolution', 'Evolution', evolutionList([p.evolution]))}
			${section(
				'moves',
				'Moves',
				html`<pokemon-moves game=${GET.game} data=${JSON.stringify(p.moves)}></pokemon-moves>`,
			)}
		`;
	},
});
