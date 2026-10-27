export const EM_DASH = "—";

export function humanize(name: string) {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function dexNumber(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}

export function orDash(value: number | string | null | undefined) {
  return value === null || value === undefined || value === "" ? EM_DASH : String(value);
}

export function pageTitle(heading?: string) {
  return heading ? `${heading} – Pokédex` : "Pokédex";
}
