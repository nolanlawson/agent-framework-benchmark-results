import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import * as gracile from '@gracile/gracile/hono';
import { Hono } from 'hono';

import { handler } from './dist/server/entrypoint.js';

const app = new Hono();

app.use(
	'/assets/*',
	serveStatic({
		root: gracile.getClientBuildPath(import.meta.url),
		onFound: (_path, c) => {
			c.header('Cache-Control', 'public, max-age=31536000, immutable');
		},
	}),
);
app.get('*', serveStatic({ root: gracile.getClientBuildPath(import.meta.url) }));

app.use(gracile.honoAdapter(handler));

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
	console.log(`Pokédex listening on http://localhost:${port} (API: ${process.env.API_BASE_URL ?? 'http://localhost:9000'})`);
});
