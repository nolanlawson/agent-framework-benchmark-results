import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { NotFoundError } from './api';
import { NotFound } from './components';
import { AbilityPage, MovePage, TypePage, TypesPage } from './pages/details';
import { HomePage, homeUrl, loadResults, parseFilters, ResultsView } from './pages/home';
import { loadPokemon, PokemonPage } from './pages/pokemon';

const app = new Hono();

app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=3600'),
  }),
);

app.get('/', async (c) => {
  const filters = parseFilters(c.req.query());
  if (c.req.header('HX-Request') && c.req.header('HX-Target') === 'results') {
    const results = await loadResults(filters);
    c.header('HX-Push-Url', homeUrl(results.filters));
    return c.html(<ResultsView results={results} />);
  }
  return c.html(<HomePage filters={filters} />);
});

app.get('/pokemon/:name', async (c) => {
  const data = await loadPokemon(c.req.param('name').toLowerCase(), c.req.query('game'));
  return c.html(<PokemonPage data={data} />);
});

app.get('/moves/:name', (c) => c.html(<MovePage name={c.req.param('name').toLowerCase()} />));
app.get('/abilities/:name', (c) => c.html(<AbilityPage name={c.req.param('name').toLowerCase()} />));
app.get('/types', (c) => c.html(<TypesPage />));
app.get('/types/:name', (c) => c.html(<TypePage name={c.req.param('name').toLowerCase()} />));

app.notFound((c) => c.html(<NotFound />, 404));

app.onError((err, c) => {
  if (err instanceof NotFoundError) return c.html(<NotFound />, 404);
  console.error(err);
  return c.text('Something went wrong', 500);
});

export default app;

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`);
});
