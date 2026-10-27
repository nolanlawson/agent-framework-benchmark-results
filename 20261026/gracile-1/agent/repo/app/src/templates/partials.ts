// Lit partials shared by the route templates (server-rendered) and the components.

import { html, nothing, type TemplateResult } from 'lit';
import { dexNumber, type CardItem, type TypeRef } from '../lib/format.js';

export function typeBadge(type: TypeRef, link = true): TemplateResult {
	return link
		? html`<a class="badge t-${type.name}" href="/types/${type.name}">${type.label}</a>`
		: html`<span class="badge t-${type.name}">${type.label}</span>`;
}

export function typeBadges(types: TypeRef[], link = true): TemplateResult {
	return html`<span class="badges">${types.map((t) => typeBadge(t, link))}</span>`;
}

export function pokemonCard(item: CardItem): TemplateResult {
	return html`<li>
		<a class="card" href="/pokemon/${item.name}">
			<img src=${item.sprite} alt="" width="96" height="96" loading="lazy" />
			<span class="card-dex">${dexNumber(item.id)}</span>
			<span class="card-name">${item.label}</span>
			${item.types ? typeBadges(item.types, false) : nothing}
			${item.hidden ? html`<span class="card-note">Hidden ability</span>` : nothing}
		</a>
	</li>`;
}

export function pokemonCards(items: CardItem[]): TemplateResult {
	return html`<ul class="cards">${items.map(pokemonCard)}</ul>`;
}

/** A region named by its heading. */
export function section(id: string, title: string, content: unknown): TemplateResult {
	return html`<section class="panel" id=${id} aria-labelledby="${id}-heading">
		<h2 id="${id}-heading">${title}</h2>
		${content}
	</section>`;
}

export function notFound(): TemplateResult {
	return html`<h1>Not found</h1>
		<p class="not-found-link"><a href="/">Back to the Pokédex</a></p>`;
}
