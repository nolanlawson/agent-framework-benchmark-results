// Production server: serves the client build's static files and hands every other
// request to React Router. Compression, TLS and HTTP/2 are left to the reverse proxy.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequestListener } from "@react-router/node";

const root = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(root, "build/client");
const build = await import("./build/server/index.js");
const port = Number(process.env.PORT ?? 3000);

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const handler = createRequestListener({ build, mode: process.env.NODE_ENV ?? "production" });

function tryStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return false;
  }
  const file = path.join(clientDir, pathname);
  if (!file.startsWith(clientDir + path.sep)) return false;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const immutable = pathname.startsWith("/assets/");
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(file).pipe(res);
  return true;
}

http
  .createServer((req, res) => {
    if (!tryStatic(req, res)) handler(req, res);
  })
  .listen(port, () => console.log(`Pokédex listening on http://localhost:${port}`));
