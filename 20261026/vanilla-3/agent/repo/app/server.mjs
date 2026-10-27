#!/usr/bin/env node
// Production server: serves the Vite build in ./dist, with the single-page app's
// index.html for every page route. The API origin is injected into index.html at
// request time so one build works against any API server.
//
// Env: PORT (default 3000), API_BASE_URL (default http://localhost:9000)

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

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

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const indexHtml = fs
  .readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace('__API_BASE_URL__', escapeAttr(API_BASE_URL));

// Page routes and, for detail pages, the API resource that must exist.
const ROUTES = [
  [/^\/$/, null],
  [/^\/types\/?$/, null],
  [/^\/pokemon\/([^/]+)\/?$/, 'pokemon-species'],
  [/^\/moves\/([^/]+)\/?$/, 'move'],
  [/^\/abilities\/([^/]+)\/?$/, 'ability'],
  [/^\/types\/([^/]+)\/?$/, 'type'],
];

// Whether the API has the resource. Errors count as "exists" so the client decides.
async function apiHas(resource, name) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v2/${resource}/${encodeURIComponent(name)}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return res.status !== 404;
  } catch {
    return true;
  }
}

async function pageStatus(pathname) {
  for (const [pattern, resource] of ROUTES) {
    const match = pathname.match(pattern);
    if (!match) continue;
    if (!resource) return 200;
    let name;
    try {
      name = decodeURIComponent(match[1]);
    } catch {
      return 404;
    }
    return (await apiHas(resource, name)) ? 200 : 404;
  }
  return 404;
}

async function serveFile(res, file) {
  let stat;
  try {
    stat = await fsp.stat(file);
  } catch {}
  if (!stat?.isFile()) return false;
  const hashed = file.startsWith(path.join(DIST, 'assets') + path.sep);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
  });
  fs.createReadStream(file).pipe(res);
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
    if (path.extname(pathname) && pathname !== '/index.html') {
      const file = path.resolve(DIST, '.' + pathname);
      if (file.startsWith(DIST + path.sep) && (await serveFile(res, file))) return;
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    const status = await pageStatus(url.pathname);
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : indexHtml);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
