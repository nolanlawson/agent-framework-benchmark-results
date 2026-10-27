export const humanize = (name: string) =>
  name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const MISSING = "—";

export const orMissing = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? MISSING : String(value);

export const pageTitle = (heading?: string) => (heading ? `${heading} – Pokédex` : "Pokédex");
