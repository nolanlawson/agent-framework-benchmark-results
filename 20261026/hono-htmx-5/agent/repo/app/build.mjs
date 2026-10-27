// Bundles the server with esbuild and copies the browser assets into dist/static.
import { build } from 'esbuild';
import fs from 'node:fs/promises';

await fs.rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.tsx'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx',
});
await fs.cp('public', 'dist/static', { recursive: true });
await fs.copyFile('node_modules/htmx.org/dist/htmx.min.js', 'dist/static/htmx.min.js');
console.log('Built dist/');
