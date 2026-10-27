// Production server: serves the built client assets and hands everything else to the
// TanStack Start fetch handler. Compression/HTTPS are left to the reverse proxy.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from 'srvx'
import { staticMiddleware } from 'srvx/static'
import handler from './dist/server/server.js'

const root = path.dirname(fileURLToPath(import.meta.url))

serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST,
  middleware: [
    staticMiddleware({
      dir: path.join(root, 'dist/client'),
      compress: false,
      maxAge: 31536000,
      immutable: true,
    }),
  ],
  fetch: (request) => handler.fetch(request),
})
