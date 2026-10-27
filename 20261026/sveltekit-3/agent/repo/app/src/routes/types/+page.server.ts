import { getMainTypes } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const types = await getMainTypes();
	return { types: types.map((t) => ({ name: t.name, label: t.label })) };
};
