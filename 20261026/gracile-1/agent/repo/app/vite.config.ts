import { gracile } from '@gracile/gracile/plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
	// Gracile renders every route's document once while building, to collect its
	// assets. Route handlers check this flag so no API data is fetched at build time.
	if (command === 'build') process.env.POKEDEX_BUILDING = '1';

	return {
		server: { port: 3000 },
		plugins: [gracile({ output: 'server' })],
	};
});
