import { html } from 'lit';

export const NOT_FOUND_TITLE = 'Not found';

export const notFound = () => html`
	<div class="page-heading"><h1>${NOT_FOUND_TITLE}</h1></div>
	<p class="not-found"><a href="/">Back to the Pokédex</a></p>
`;
