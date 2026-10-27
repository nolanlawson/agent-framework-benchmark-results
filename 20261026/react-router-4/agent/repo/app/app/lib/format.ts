export type NamedRef = { name: string; url: string };

export const EM_DASH = "—";

/** `mr-mime` -> `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** `25` -> `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** Trailing numeric ID of an API URL such as `.../pokemon/25/`. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

export function orDash(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === "" ? EM_DASH : String(value);
}

export function pageTitle(heading: string) {
  return `${heading} – Pokédex`;
}
