import { typeNames } from '#lib/server/pokeapi.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const types = await typeNames();
	return { types: [...types].map(([name, label]) => ({ name, label })) };
};
