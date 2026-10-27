// Serves the production build. Every non-asset path gets index.html (the client router
// renders it) with the API origin injected, so the API location is read at runtime.
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

const config = `<script>window.API_BASE_URL=${JSON.stringify(API_BASE_URL).replace(/</g, '\\u003c')}</script>`;
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').replace('<head>', `<head>${config}`);

// Pages that name an API resource; a 404 from the API means a 404 page.
const RESOURCE_ROUTES = [
  [/^\/pokemon\/([^/]+)\/?$/, 'pokemon-species'],
  [/^\/moves\/([^/]+)\/?$/, 'move'],
  [/^\/abilities\/([^/]+)\/?$/, 'ability'],
  [/^\/types\/([^/]+)\/?$/, 'type'],
];

async function pageStatus(pathname) {
  if (pathname === '/' || /^\/types\/?$/.test(pathname)) return 200;
  for (const [pattern, resource] of RESOURCE_ROUTES) {
    const match = pathname.match(pattern);
    if (!match) continue;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/${resource}/${match[1]}/`, { method: 'HEAD' });
      return res.status === 404 ? 404 : 200;
    } catch {
      return 200; // Let the client report the error.
    }
  }
  return 404;
}

async function serveFile(res, file) {
  const stat = await fsp.stat(file).catch(() => null);
  if (!stat?.isFile()) return false;
  const immutable = file.startsWith(path.join(DIST, 'assets') + path.sep);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
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
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname !== '/' && !pathname.endsWith('/')) {
      const file = path.resolve(DIST, '.' + decodeURIComponent(pathname));
      if (file.startsWith(DIST + path.sep) && path.basename(file) !== 'index.html' && (await serveFile(res, file))) return;
    }
    const status = await pageStatus(pathname);
    res.writeHead(status, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : indexHtml);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, () => console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`));
