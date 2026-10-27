import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	API_BASE_URL: {
		description: 'Origin of the PokeAPI server, reachable from both the server and the browser',
		schema: (value) => (value || 'http://localhost:9000').replace(/\/+$/, '')
	}
});
