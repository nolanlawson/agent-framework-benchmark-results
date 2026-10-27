// Formatting helpers shared by server and client components.

type Localized = { language: { name: string } };

export const MISSING = "—";

export function humanize(apiName: string): string {
  return apiName
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === "en");
}

export function lastEnglish<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.findLast((e) => e.language.name === "en");
}

export function englishName(entries: { name: string; language: { name: string } }[] | undefined, apiName: string): string {
  return english(entries)?.name ?? humanize(apiName);
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | undefined {
  const entry = lastEnglish(entries);
  return entry ? collapseWhitespace(entry.flavor_text) : undefined;
}

// The numeric ID at the end of an API URL such as ".../pokemon/25/".
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === "" ? MISSING : String(value);
}

// API names only use letters, digits and dashes; anything else can't be a resource.
export function isApiName(name: string): boolean {
  return /^[a-z0-9-]+$/i.test(name);
}
