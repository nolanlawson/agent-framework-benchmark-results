#!/usr/bin/env node
// Serves the production build. Every non-asset URL gets index.html (the app routes on the
// client), with the API origin injected so it can change without rebuilding.
//
// Env: PORT (default 3000), API_BASE_URL (default http://localhost:9000)

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const config = `<script>window.__API_BASE_URL__=${JSON.stringify(API_BASE_URL).replace(/</g, '\\u003c')}</script>`
  + `<link rel="preconnect" href="${API_BASE_URL.replace(/"/g, '&quot;')}" crossorigin>`;
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').replace('<!--app-config-->', config);

// Pages whose resource is looked up in the API, so unknown names can get a 404 status.
const RESOURCE_ROUTES = [
  [/^\/pokemon\/([^/]+)\/?$/, 'pokemon-species'],
  [/^\/moves\/([^/]+)\/?$/, 'move'],
  [/^\/abilities\/([^/]+)\/?$/, 'ability'],
  [/^\/types\/([^/]+)\/?$/, 'type'],
];
const STATIC_ROUTES = [/^\/$/, /^\/types\/?$/];

async function pageStatus(pathname) {
  if (STATIC_ROUTES.some((re) => re.test(pathname))) return 200;
  for (const [re, resource] of RESOURCE_ROUTES) {
    const match = pathname.match(re);
    if (!match) continue;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/${resource}/${match[1]}/`, { signal: AbortSignal.timeout(3000) });
      await res.body?.cancel();
      return res.status === 404 ? 404 : 200;
    } catch {
      return 200; // Let the client decide if the API is unreachable from here.
    }
  }
  return 404;
}

async function serveFile(req, res, file) {
  let stat;
  try {
    stat = await fsp.stat(file);
  } catch {}
  if (!stat?.isFile()) return false;
  const immutable = file.startsWith(path.join(DIST, 'assets') + path.sep);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      pathname = url.pathname;
    }
    if (pathname !== '/' && pathname !== '/index.html') {
      const file = path.resolve(DIST, '.' + pathname);
      if (file.startsWith(DIST + path.sep) && (await serveFile(req, res, file))) return;
    }
    const status = await pageStatus(url.pathname);
    res.writeHead(status, {
      'Content-Type': MIME['.html'],
      'Content-Length': Buffer.byteLength(indexHtml),
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : indexHtml);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, () => console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`));
