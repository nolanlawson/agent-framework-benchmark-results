// Formatting helpers shared by the server loaders and the components.

export type NamedRef = { name: string; url: string };
type Localized = { language: { name: string } };

export const DASH = "—";

export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.find((entry) => entry.language.name === "en");
}

export function latestEnglish<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.findLast((entry) => entry.language.name === "en");
}

export function englishName(entries: { name: string; language: { name: string } }[] | undefined, fallback: string): string {
  return english(entries)?.name ?? humanize(fallback);
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | undefined {
  const entry = latestEnglish(entries);
  return entry ? collapseWhitespace(entry.flavor_text) : undefined;
}

export function orDash(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === "" ? DASH : String(value);
}

export function pageTitle(heading?: string): string {
  return heading ? `${heading} – Pokédex` : "Pokédex";
}
