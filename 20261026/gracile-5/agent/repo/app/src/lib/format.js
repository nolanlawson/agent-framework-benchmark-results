// Formatting helpers shared by the server and the browser.

export const MISSING = '—';

export const humanize = (name) =>
  String(name)
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

export const englishName = (resource) =>
  resource?.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(resource?.name ?? '');

export const collapse = (text) => String(text).replace(/\s+/g, ' ').trim();

export function latestEnglishFlavorText(entries = []) {
  const english = entries.filter((e) => e.language?.name === 'en');
  const last = english.at(-1);
  return last ? collapse(last.flavor_text ?? last.text ?? '') : null;
}

export const orMissing = (value) => (value === null || value === undefined || value === '' ? MISSING : String(value));

// Last numeric path segment of an API URL (`.../pokemon/25/` -> 25).
export const idFromUrl = (url) => Number(String(url).match(/\/(\d+)\/?$/)?.[1]);

export const spriteUrl = (apiBase, id) => `${apiBase}/media/sprites/pokemon/${id}.png`;
