import { html } from 'lit';

export const NOT_FOUND_TITLE = 'Not found';

export const notFoundTemplate = () => html`
  <h1>${NOT_FOUND_TITLE}</h1>
  <p><a href="/">Back to the Pokédex</a></p>
`;
