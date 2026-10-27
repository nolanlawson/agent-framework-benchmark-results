import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { fileURLToPath } from 'node:url';
import { renderer } from './components.js';
import { abilityPage } from './pages/ability.js';
import { homePage } from './pages/home.js';
import { movePage } from './pages/move.js';
import { notFoundPage } from './pages/not-found.js';
import { pokemonPage } from './pages/pokemon.js';
import { typePage, typesPage } from './pages/types.js';

const app = new Hono();

const staticRoot = fileURLToPath(new URL('./static', import.meta.url));
app.use(
  '/static/*',
  serveStatic({
    root: staticRoot,
    rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
    onFound: (_path, c) => {
      c.header('Cache-Control', 'public, max-age=3600');
    },
  }),
);

app.use(renderer);

app.get('/', homePage);
app.get('/pokemon/:name', pokemonPage);
app.get('/moves/:name', movePage);
app.get('/abilities/:name', abilityPage);
app.get('/types', typesPage);
app.get('/types/:name', typePage);

app.notFound(notFoundPage);
app.onError((err, c) => {
  console.error(err);
  c.status(500);
  return c.render(
    <>
      <h1>Something went wrong</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>,
    { title: 'Something went wrong' },
  );
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`);
});
