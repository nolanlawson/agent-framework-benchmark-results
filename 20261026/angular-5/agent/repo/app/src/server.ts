import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { loadData } from './server/pokeapi';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Server-side rendering never makes requests derived from the Host header (data comes
// from API_BASE_URL only), and in production a reverse proxy validates hosts, so accept
// any host unless NG_ALLOWED_HOSTS narrows it down.
const angularApp = new AngularNodeAppEngine(
  process.env['NG_ALLOWED_HOSTS'] ? undefined : { allowedHosts: ['*'] },
);

/**
 * Page view models for client-side navigation, computed from the PokeAPI at request time.
 */
app.get('/data/{*path}', async (req, res, next) => {
  try {
    const url = new URL(req.originalUrl, 'http://localhost');
    const data = await loadData(url.pathname.slice('/data/'.length), url.searchParams);
    res.setHeader('Cache-Control', 'no-cache');
    if (data === null) res.status(404).json(null);
    else res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 3000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
