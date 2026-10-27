import { englishName, getTypes } from '#lib/server/api.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const types = await getTypes();
	return { types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })) };
};
