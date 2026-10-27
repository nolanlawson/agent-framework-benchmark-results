// Static assets, loaded once at startup and served with content-hashed URLs.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const publicFile = (name: string) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

const sources: Record<string, { path: string; type: string }> = {
  'tokens.css': { path: publicFile('tokens.css'), type: 'text/css; charset=utf-8' },
  'app.css': { path: publicFile('app.css'), type: 'text/css; charset=utf-8' },
  'htmx.min.js': { path: require.resolve('htmx.org/dist/htmx.min.js'), type: 'text/javascript; charset=utf-8' },
}

export const assets = new Map(
  Object.entries(sources).map(([name, { path, type }]) => {
    const body = readFileSync(path)
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 10)
    return [name, { body, type, hash }]
  }),
)

export const assetUrl = (name: string) => `/static/${name}?v=${assets.get(name)?.hash}`
