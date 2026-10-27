import express from 'express';

import * as gracile from '@gracile/gracile/node';

import { handler } from './dist/server/entrypoint.js';

const port = Number(process.env.PORT) || 3000;
const app = express();

app.disable('x-powered-by');
app.use(
	express.static(gracile.getClientBuildPath(import.meta.url), {
		index: false,
		setHeaders(res, path) {
			// Hashed build assets never change.
			if (path.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		},
	}),
);
app.use(gracile.nodeAdapter(handler));

const server = app.listen(port, () => gracile.printUrls(server.address()));
