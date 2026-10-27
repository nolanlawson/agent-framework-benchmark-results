export const MISSING = "—";

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === "" ? MISSING : String(value);
}

export function pageTitle(heading?: string): string {
  return heading ? `${heading} – Pokédex` : "Pokédex";
}
