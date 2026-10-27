// Production server: static client assets plus the TanStack Start request handler.
// HTTPS, HTTP/2 and compression are left to the reverse proxy in front of it.
import { serve } from 'srvx/node'
import { staticMiddleware } from 'srvx/static'
import { fileURLToPath } from 'node:url'
import handler from './dist/server/server.js'

const clientDir = fileURLToPath(new URL('./dist/client', import.meta.url))
const assets = staticMiddleware({ dir: clientDir, compress: false, maxAge: 31536000, immutable: true })

serve({
  port: Number(process.env.PORT ?? 3000),
  middleware: [(request, next) => (new URL(request.url).pathname.startsWith('/assets/') ? assets(request, next) : next())],
  fetch: (request) => handler.fetch(request),
})
