// Production server: serves the built client assets and hands every other request to
// the TanStack Start server entry.
import { serve } from 'srvx'
import { staticMiddleware } from 'srvx/static'
import entry from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)

serve({
  port,
  hostname: process.env.HOST,
  middleware: [staticMiddleware({ dir: new URL('./dist/client', import.meta.url).pathname })],
  fetch: (request) => entry.fetch(request),
})
