import { html } from '@gracile/gracile/server-html';

import { spriteUrl } from './api.js';
import { dexNumber } from './format.js';

export type CardData = {
	id: number;
	name: string;
	label: string;
	types?: Array<{ name: string; label: string }>;
	note?: string;
};

export const typeBadge = (type: { name: string; label: string }) =>
	html`<span class="type-badge" style=${`--type-color: var(--type-${type.name}, var(--color-text-muted))`}>${type.label}</span>`;

export const typeLink = (type: { name: string; label: string }) =>
	html`<a class="type-badge" href=${`/types/${type.name}`} style=${`--type-color: var(--type-${type.name}, var(--color-text-muted))`}>${type.label}</a>`;

export const pokemonCard = (card: CardData) => html`
	<li>
		<a class="card" href=${`/pokemon/${card.name}`}>
			<img
				class="card__sprite"
				src=${spriteUrl(card.id)}
				alt=""
				width="96"
				height="96"
				loading="lazy"
				onerror="this.style.visibility='hidden'"
			/>
			<span class="card__dex">${dexNumber(card.id)}</span>
			<span class="card__name">${card.label}</span>
			${card.types?.length
				? html`<span class="card__types">${card.types.map(typeBadge)}</span>`
				: null}
			${card.note ? html`<span class="card__note">${card.note}</span>` : null}
		</a>
	</li>
`;

export const cardList = (cards: CardData[]) =>
	html`<ul class="card-grid" role="list">${cards.map(pokemonCard)}</ul>`;

/** A `region` landmark named by its heading. */
export const section = (id: string, heading: string, content: unknown, className = '') => html`
	<section class=${`panel ${className}`} id=${id} aria-labelledby=${`${id}-heading`}>
		<h2 id=${`${id}-heading`}>${heading}</h2>
		${content}
	</section>
`;

export const notFound = () => html`
	<h1>Not found</h1>
	<p><a href="/">Back to the Pokédex</a></p>
`;
