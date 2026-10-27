// Production server: serves the client build and hands everything else to Gracile.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import * as gracile from '@gracile/gracile/node';

import { handler } from './dist/server/entrypoint.js';

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIR = gracile.getClientBuildPath(import.meta.url);

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
};

const gracileHandler = gracile.nodeAdapter(handler);

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(CLIENT_DIR, `.${pathname}`);
  if (!file.startsWith(CLIENT_DIR + path.sep)) return false;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile() || file.endsWith('.html')) return false;
  const immutable = pathname.startsWith('/assets/');
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    if (serveStatic(req, res)) return;
    await gracileHandler(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => gracile.printUrls(server.address()));
