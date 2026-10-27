// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true, port: 3000 },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
});
