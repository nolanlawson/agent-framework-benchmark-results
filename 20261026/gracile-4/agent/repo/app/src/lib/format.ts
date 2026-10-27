export type NamedRef = { name: string; url: string };
export type Localized = { name: string; language: NamedRef };

export const EM_DASH = '—';

/** `mr-mime` → `Mr Mime` */
export const humanize = (name: string) =>
	name
		.split('-')
		.filter(Boolean)
		.map((word) => word[0]!.toUpperCase() + word.slice(1))
		.join(' ');

/** `25` → `#0025` */
export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

/** The English entry of a `names` array, falling back to the humanized API name. */
export const englishName = (names: Localized[] | undefined, fallback: string) =>
	names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);

export const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The last English entry of a `flavor_text_entries` array, whitespace collapsed. */
export function latestEnglishFlavorText(
	entries: Array<{ flavor_text: string; language: NamedRef }> | undefined,
): string | null {
	const english = entries?.filter((e) => e.language.name === 'en') ?? [];
	const last = english.at(-1);
	return last ? collapseWhitespace(last.flavor_text) : null;
}

export const orDash = (value: number | string | null | undefined) =>
	value === null || value === undefined || value === '' ? EM_DASH : String(value);

export const pageTitle = (heading: string | null | undefined) =>
	heading ? `${heading} – Pokédex` : 'Pokédex';
