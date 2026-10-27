export const SITE_NAME = "Pokédex";

export const pageTitle = (heading: string) => `${heading} – ${SITE_NAME}`;

/** `mr-mime` → `Mr Mime` */
export const humanize = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** `25` → `#0025` */
export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const MISSING = "—";

export const display = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? MISSING : String(value);
