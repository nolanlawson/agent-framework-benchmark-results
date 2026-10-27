// Copies static assets (CSS, client script, htmx) into dist/static.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = new URL('../dist/static/', import.meta.url);
await fs.rm(out, { recursive: true, force: true });
await fs.cp(new URL('../public/', import.meta.url), out, { recursive: true });
await fs.copyFile(require.resolve('htmx.org/dist/htmx.min.js'), new URL('htmx.min.js', out));
