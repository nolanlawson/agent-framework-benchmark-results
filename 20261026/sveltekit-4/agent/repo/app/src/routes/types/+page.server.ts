import { getTypes } from '#lib/server/api.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { types } = await getTypes();
	return { types: types.map(({ name, label }) => ({ name, label })) };
};
