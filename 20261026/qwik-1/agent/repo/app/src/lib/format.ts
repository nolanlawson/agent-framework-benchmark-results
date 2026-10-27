// Formatting helpers and shared data shapes, safe to use on the server and in the browser.

export type TypeRef = { name: string; label: string };

export type CardData = {
  id: number;
  name: string;
  label: string;
  dex: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
};

export const DASH = "—";

export const humanize = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const padDex = (id: number) => `#${String(id).padStart(4, "0")}`;

export const orDash = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? DASH : String(value);

export const pageTitle = (h1: string) => `${h1} – Pokédex`;

/** Home page URL for a set of filters, leaving out empty and default values. */
export function homeHref(f: { q?: string; type?: string; generation?: string; page?: number }) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.type) params.set("type", f.type);
  if (f.generation) params.set("generation", f.generation);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
