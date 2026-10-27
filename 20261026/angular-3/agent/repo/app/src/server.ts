import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { handleDataRequest } from './server/pokedex-data';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Local hosts are always allowed; set NG_ALLOWED_HOSTS for the public hostname(s).
const angularApp = new AngularNodeAppEngine({ allowedHosts: ['localhost', '127.0.0.1', '[::1]'] });

/**
 * View-model endpoints used by the browser after hydration. They fetch from the API at
 * request time.
 */
app.get('/data/{*path}', (req, res) => {
  handleDataRequest(req.originalUrl)
    .then((body) => {
      res.set('Cache-Control', 'no-cache').json(body);
    })
    .catch((err: unknown) => {
      console.error(err);
      res.status(502).json({ error: 'Upstream API request failed' });
    });
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
