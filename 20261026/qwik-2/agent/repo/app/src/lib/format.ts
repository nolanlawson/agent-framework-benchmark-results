// Formatting helpers shared by the server loaders and the components.

export const EM_DASH = "—";

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function pageTitle(heading: string): string {
  return `${heading} – Pokédex`;
}

export function orDash(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === ""
    ? EM_DASH
    : String(value);
}
