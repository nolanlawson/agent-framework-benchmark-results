import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import { getAbility, getDex, getMove, getType, getTypes } from './api.js';
import { docTitle, Layout, NotFound } from './components.js';
import { AbilityPage, MovePage, TypePage, TypesPage } from './pages/details.js';
import { HomePage, homeUrl, loadResults, parseHomeQuery, Results } from './pages/home.js';
import { loadPokemon, MovesBody, PokemonPage } from './pages/pokemon.js';

const app = new Hono();

const isHtmx = (c: Context) => c.req.header('HX-Request') === 'true' && c.req.header('HX-History-Restore-Request') !== 'true';

const page = (c: Context, title: string, body: Child, status: 200 | 404 | 500 = 200) =>
  c.html(
    <>
      {raw('<!DOCTYPE html>')}
      <Layout title={title}>{body}</Layout>
    </>,
    status,
  );

const notFound = (c: Context) => page(c, docTitle('Not found'), <NotFound />, 404);

app.use(
  '/static/*',
  serveStatic({
    root: path.join(import.meta.dirname, 'public'),
    rewriteRequestPath: (p) => p.replace(/^\/static/, ''),
    onFound: (_p, c) => {
      c.header('Cache-Control', 'public, max-age=3600');
    },
  }),
);

app.get('/', async (c) => {
  const query = parseHomeQuery(new URL(c.req.url).searchParams);
  const data = await loadResults(query);
  if (isHtmx(c)) {
    // Filters changed: reflect the canonical (filtered, page 1) URL in the address bar.
    c.header('HX-Push-Url', homeUrl({ ...query, page: data.page }));
    c.header('Vary', 'HX-Request');
    return c.html(<Results data={data} />);
  }
  c.header('Vary', 'HX-Request');
  return page(c, 'Pokédex', <HomePage data={data} />);
});

app.get('/pokemon/:name', async (c) => {
  const data = await loadPokemon(c.req.param('name'));
  if (!data) return notFound(c);
  return page(c, docTitle(data.species.names.find((n) => n.language.name === 'en')?.name ?? data.species.name), (
    <PokemonPage data={data} game={c.req.query('game') ?? null} />
  ));
});

app.get('/pokemon/:name/moves', async (c) => {
  const name = c.req.param('name');
  const data = await loadPokemon(name);
  if (!data) return notFound(c);
  const game = c.req.query('game') ?? null;
  if (!isHtmx(c)) return c.redirect(`/pokemon/${data.species.name}${game ? `?game=${encodeURIComponent(game)}` : ''}#moves`);
  c.header('HX-Push-Url', `/pokemon/${data.species.name}${game ? `?game=${encodeURIComponent(game)}` : ''}`);
  return c.html(<MovesBody pokemon={data.pokemon} speciesName={data.species.name} game={game} />);
});

app.get('/moves/:name', async (c) => {
  const move = await getMove(c.req.param('name'));
  if (!move) return notFound(c);
  return page(c, docTitle(move.names.find((n) => n.language.name === 'en')?.name ?? move.name), <MovePage move={move} />);
});

app.get('/abilities/:name', async (c) => {
  const ability = await getAbility(c.req.param('name'));
  if (!ability) return notFound(c);
  const title = ability.names.find((n) => n.language.name === 'en')?.name ?? ability.name;
  return page(c, docTitle(title), <AbilityPage ability={ability} />);
});

app.get('/types', (c) => page(c, docTitle('Types'), <TypesPage />));

app.get('/types/:name', async (c) => {
  const type = await getType(c.req.param('name'));
  if (!type) return notFound(c);
  const title = type.names.find((n) => n.language.name === 'en')?.name ?? type.name;
  return page(c, docTitle(title), <TypePage type={type} />);
});

app.notFound(notFound);

app.onError((err, c) => {
  console.error(err);
  return page(
    c,
    docTitle('Something went wrong'),
    <>
      <h1>Something went wrong</h1>
      <p>
        The Pokédex couldn't load this page. <a href={c.req.url}>Try again</a> or go <a href="/">back to the Pokédex</a>.
      </p>
    </>,
    500,
  );
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`);
  // Warm the caches used by the home page so the first visitor doesn't wait for them.
  Promise.all([getDex(), getTypes()]).catch((err) => console.error('Cache warm-up failed:', err.message));
});
