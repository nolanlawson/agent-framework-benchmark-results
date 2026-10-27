// Copies static assets (our CSS/JS plus htmx from node_modules) into dist/public.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = path.resolve('dist/public');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.resolve('public'), out, { recursive: true });
const htmxDir = path.dirname(require.resolve('htmx.org/dist/htmx.min.js'));
fs.copyFileSync(path.join(htmxDir, 'htmx.min.js'), path.join(out, 'htmx.min.js'));
