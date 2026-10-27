// Formatting helpers shared by server and client code.

interface Named {
	name: string;
	language: { name: string };
}

interface FlavorText {
	flavor_text: string;
	language: { name: string };
}

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
	return name
		.split('-')
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

/** The English entry of a `names` array, falling back to the humanized API name. */
export function englishName(names: Named[] | undefined, apiName: string): string {
	return names?.find((n) => n.language.name === 'en')?.name ?? humanize(apiName);
}

export function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, with whitespace collapsed. */
export function latestFlavorText(entries: FlavorText[] | undefined): string | null {
	const english = entries?.filter((e) => e.language.name === 'en') ?? [];
	const last = english.at(-1);
	return last ? collapseWhitespace(last.flavor_text) : null;
}

export const MISSING = '—';

export function orMissing(value: number | string | null | undefined): string {
	return value === null || value === undefined || value === '' ? MISSING : String(value);
}

/** Numeric ID from a PokeAPI resource URL such as `.../pokemon/25/`. */
export function idFromUrl(url: string): number {
	const match = url.match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : NaN;
}
