export const SITE_NAME = "Pokédex";

export function pageTitle(heading: string) {
  return `${heading} – ${SITE_NAME}`;
}

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string) {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `25` → `#0025` */
export function dexNumber(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}

export const MISSING = "—";

export function orMissing(value: number | string | null | undefined) {
  return value === null || value === undefined || value === "" ? MISSING : String(value);
}
