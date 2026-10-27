// Formatting helpers shared by the server loaders and the components.

export const EM_DASH = "—";

export const SITE_NAME = "Pokédex";

export const pageTitle = (h1: string) => `${h1} – ${SITE_NAME}`;

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `25` → `#0025` */
export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const orDash = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? EM_DASH : String(value);

export interface TypeRef {
  name: string;
  label: string;
}

export interface CardData {
  id: number;
  /** Species API name. */
  name: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
}
