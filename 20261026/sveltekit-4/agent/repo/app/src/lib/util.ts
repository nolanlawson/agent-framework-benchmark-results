// Formatting helpers shared by server and client code.

export const DASH = '—';

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

export function display(value: number | string | null | undefined): string {
	return value === null || value === undefined || value === '' ? DASH : String(value);
}

export interface TypeRef {
	name: string;
	label: string;
}

export interface Card {
	id: number;
	name: string;
	label: string;
	sprite: string;
	types?: TypeRef[];
	hidden?: boolean;
}
