interface Localized {
	language: { name: string };
}

export const MISSING = '—';

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
	return name
		.split('-')
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

/** `#0025` */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

export function englishName(names: ({ name: string } & Localized)[] | undefined, fallback: string): string {
	return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

export function lastEnglishFlavorText(entries: ({ flavor_text: string } & Localized)[] | undefined): string | null {
	const english = entries?.filter((e) => e.language.name === 'en') ?? [];
	const last = english.at(-1);
	return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function orMissing(value: string | number | null | undefined): string {
	return value === null || value === undefined || value === '' ? MISSING : String(value);
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const isExcludedType = (name: string) => EXCLUDED_TYPES.has(name);
