import express from 'express';

import * as gracile from '@gracile/gracile/node';

import { handler } from './dist/server/entrypoint.js';

const port = Number(process.env.PORT ?? 3000);

const app = express();
app.disable('x-powered-by');

app.use(
	'/assets',
	express.static(`${gracile.getClientBuildPath(import.meta.url)}/assets`, {
		immutable: true,
		maxAge: '1y',
		fallthrough: false,
	}),
);
app.use(express.static(gracile.getClientBuildPath(import.meta.url)));

app.use(gracile.nodeAdapter(handler));

const server = app.listen(port, () => gracile.printUrls(server.address()));
