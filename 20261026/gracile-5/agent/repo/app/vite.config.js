import { gracile } from '@gracile/gracile/plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Gracile renders each route's document during the build to collect its assets, which
  // runs route handlers. Handlers check this flag so no API data is fetched at build time.
  if (command === 'build') process.env.POKEDEX_BUILD = '1';

  return {
    server: { port: Number(process.env.PORT ?? 3000) },
    plugins: [gracile({ output: 'server' })],
  };
});
