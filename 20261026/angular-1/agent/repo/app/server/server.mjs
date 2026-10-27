#!/usr/bin/env node
// Serves the production build of the app.
//
// - Static files from dist/app/browser; hashed bundles are cached for a year.
// - Every other path gets index.html with the API origin (API_BASE_URL) written into it,
//   so the browser app talks to whichever API the server was started against.
// - Responds 404 for paths that aren't app routes, and for Pokémon, move, ability and type
//   pages the API doesn't know (the app shows its not-found page either way).
//
// Env: PORT (default 3000), API_BASE_URL (default http://localhost:9000).

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/app/browser');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
const API_CHECK_TIMEOUT_MS = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error(`No build found at ${ROOT}. Run "npm run build" first.`);
  process.exit(1);
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replaceAll('__API_BASE_URL__', escapeAttr(API_BASE_URL));

// App routes whose page depends on an API resource existing.
const DETAIL_ROUTES = [
  [/^\/pokemon\/([^/]+)\/?$/, 'pokemon-species'],
  [/^\/moves\/([^/]+)\/?$/, 'move'],
  [/^\/abilities\/([^/]+)\/?$/, 'ability'],
  [/^\/types\/([^/]+)\/?$/, 'type'],
];
const STATIC_ROUTES = new Set(['/', '/types', '/types/']);

/** HTTP status for an app URL: 404 when it can't be a page, 200 otherwise (or if unsure). */
async function routeStatus(pathname) {
  if (STATIC_ROUTES.has(pathname)) return 200;
  for (const [pattern, resource] of DETAIL_ROUTES) {
    const match = pattern.exec(pathname);
    if (!match) continue;
    let name;
    try {
      name = decodeURIComponent(match[1]);
    } catch {
      return 404;
    }
    if (!/^[a-z0-9-]+$/i.test(name)) return 404;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/${resource}/${name.toLowerCase()}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(API_CHECK_TIMEOUT_MS),
      });
      return res.status === 404 ? 404 : 200;
    } catch {
      return 200;
    }
  }
  return 404;
}

async function serveFile(req, res, file, pathname) {
  // The build hashes every script and stylesheet name (outputHashing: all).
  const immutable = /\.(js|css)$/.test(pathname);
  const stat = await fsp.stat(file);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

async function staticFile(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const file = path.resolve(ROOT, `.${rel}`);
  if (!file.startsWith(ROOT + path.sep) || path.basename(file) === 'index.html') return null;
  try {
    return (await fsp.stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const { pathname } = new URL(req.url, 'http://localhost');

    const file = await staticFile(pathname);
    if (file) return await serveFile(req, res, file, pathname);

    // Missing assets get a plain 404 rather than the app.
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }

    const status = await routeStatus(pathname);
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : indexHtml);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.keepAliveTimeout = 65_000;
server.listen(PORT, () => {
  console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
