// Production server: serves the built client assets and hands every other request to
// the TanStack Start handler. HTTPS, HTTP/2 and compression are left to the reverse proxy.
import { serve } from 'srvx'
import { staticMiddleware } from 'srvx/static'
import { fileURLToPath } from 'node:url'
import handler from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)

serve({
  port,
  fetch: (request) => handler.fetch(request),
  middleware: [
    staticMiddleware({
      dir: fileURLToPath(new URL('./dist/client', import.meta.url)),
      compress: false,
      maxAge: 31536000,
      immutable: true,
    }),
  ],
})
