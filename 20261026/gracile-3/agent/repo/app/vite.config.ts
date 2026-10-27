import { gracile } from '@gracile/gracile/plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
	// Gracile calls page handlers once during the build to render each route's document
	// shell. Flag it so handlers skip API calls: data is only fetched at request time.
	if (command === 'build') process.env['POKEDEX_BUILD_STEP'] = '1';

	return {
		plugins: [gracile({ output: 'server' })],
	};
});
