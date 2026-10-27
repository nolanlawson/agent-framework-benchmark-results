export interface NamedRef {
  name: string;
  url: string;
}

interface Localized {
  language: NamedRef;
}

export const EM_DASH = "—";

export const humanize = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const englishEntry = <T extends Localized>(entries: T[] | undefined) =>
  entries?.find((e) => e.language.name === "en");

export const lastEnglishEntry = <T extends Localized>(entries: T[] | undefined) =>
  entries?.filter((e) => e.language.name === "en").at(-1);

export const englishName = (
  resource: { name: string; names?: ({ name: string } & Localized)[] },
) => englishEntry(resource.names)?.name ?? humanize(resource.name);

export const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

export const latestFlavorText = (
  entries: ({ flavor_text: string } & Localized)[] | undefined,
) => {
  const entry = lastEnglishEntry(entries);
  return entry ? cleanText(entry.flavor_text) : undefined;
};

export const orDash = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? EM_DASH : String(value);

export const title = (h1: string) => `${h1} – Pokédex`;
