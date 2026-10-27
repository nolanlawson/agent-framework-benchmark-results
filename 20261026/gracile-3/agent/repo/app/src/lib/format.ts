// Formatting helpers shared by the server routes and the client scripts.

export const DASH = '—';

export interface NamedEntry {
	name: string;
	language: { name: string };
}

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
	return name
		.split('-')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

/** The English entry of a `names` array, or the humanized API name. */
export function englishName(names: NamedEntry[] | undefined, fallback: string): string {
	return names?.find((entry) => entry.language.name === 'en')?.name ?? humanize(fallback);
}

export function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/** The last English entry of `flavor_text_entries`, whitespace collapsed. */
export function latestFlavorText(
	entries: { flavor_text: string; language: { name: string } }[] | undefined,
): string | undefined {
	const english = entries?.filter((entry) => entry.language.name === 'en') ?? [];
	const last = english.at(-1);
	return last ? collapseWhitespace(last.flavor_text) : undefined;
}

/** `https://…/api/v2/pokemon/25/` → `25` */
export function idFromUrl(url: string): number {
	return Number(/\/(\d+)\/?$/.exec(url)?.[1] ?? NaN);
}

export function orDash(value: number | string | null | undefined): string {
	return value === null || value === undefined || value === '' ? DASH : String(value);
}

export function spriteUrl(apiBase: string, id: number): string {
	return `${apiBase}/media/sprites/pokemon/${id}.png`;
}
