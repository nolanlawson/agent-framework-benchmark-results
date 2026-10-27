// Lit templates shared by the server-rendered routes and the client scripts.

import { html, nothing, type TemplateResult } from 'lit';

import { type BrowseResult, stateToSearch } from '../lib/browse.js';
import { dexNumber } from '../lib/format.js';
import type { Card, TypeRef } from '../lib/types.js';

export function typeBadge(type: TypeRef, { link = true } = {}): TemplateResult {
	return link
		? html`<a class="type-badge type-${type.name}" href="/types/${type.name}">${type.label}</a>`
		: html`<span class="type-badge type-${type.name}">${type.label}</span>`;
}

/** A section: a region named by its heading. */
export function section(id: string, title: string, content: unknown, { domId }: { domId?: string } = {}): TemplateResult {
	return html`
		<section class="panel" id=${domId ?? nothing} aria-labelledby="${id}-heading">
			<h2 id="${id}-heading">${title}</h2>
			${content}
		</section>
	`;
}

export function count(n: number, noun = 'Pokémon'): TemplateResult {
	return html`<p class="count">${n} ${noun}</p>`;
}

export function pokemonCard(card: Card): TemplateResult {
	return html`
		<li class="card">
			<a href="/pokemon/${card.name}">
				<img src=${card.sprite} alt="" width="96" height="96" loading="lazy" decoding="async" />
				<span class="card-number">${dexNumber(card.id)}</span>
				<span class="card-name">${card.label}</span>
				${card.types?.length
					? html`<span class="card-types">${card.types.map((type) => typeBadge(type, { link: false }))}</span>`
					: nothing}
				${card.note ? html`<span class="card-note">${card.note}</span>` : nothing}
			</a>
		</li>
	`;
}

export function cardList(cards: Card[]): TemplateResult {
	return html`<ul class="card-grid" role="list">${cards.map(pokemonCard)}</ul>`;
}

/** Count, cards and pagination for the Pokémon list. */
export function browseResults(result: BrowseResult): TemplateResult {
	const { state, total, page, pageCount, cards } = result;
	if (total === 0) return html`<p class="count">No Pokémon found</p>`;
	const pageHref = (n: number) => `/${stateToSearch({ ...state, page: n })}`;
	return html`
		${count(total)} ${cardList(cards)}
		<nav class="pagination" aria-label="Pagination">
			${page > 1 ? html`<a href=${pageHref(page - 1)} rel="prev">Previous page</a>` : nothing}
			<span>Page ${page} of ${pageCount}</span>
			${page < pageCount ? html`<a href=${pageHref(page + 1)} rel="next">Next page</a>` : nothing}
		</nav>
	`;
}
