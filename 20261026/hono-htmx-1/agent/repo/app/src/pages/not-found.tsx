import type { Context } from 'hono';

export function notFoundPage(c: Context) {
  c.status(404);
  return c.render(
    <>
      <h1>Not found</h1>
      <p class="not-found-link">
        <a href="/">Back to the Pokédex</a>
      </p>
    </>,
    { title: 'Not found' },
  );
}
