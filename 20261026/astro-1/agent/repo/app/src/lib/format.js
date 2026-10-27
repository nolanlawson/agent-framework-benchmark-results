export const DASH = '—';

export const humanize = (name = '') =>
  name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

const english = (entries = []) => entries.filter((e) => e.language?.name === 'en');

export const englishName = (record) => english(record?.names)[0]?.name ?? humanize(record?.name);

export const englishGenus = (species) => english(species?.genera)[0]?.genus ?? '';

export const cleanText = (text = '') => text.replace(/\s+/g, ' ').trim();

export function latestFlavorText(record) {
  const entries = english(record?.flavor_text_entries);
  const last = entries[entries.length - 1];
  return last ? cleanText(last.flavor_text ?? last.text ?? '') : '';
}

export function shortEffect(record) {
  const entry = english(record?.effect_entries)[0];
  return entry?.short_effect ? cleanText(entry.short_effect) : '';
}

export const orDash = (value) => (value === null || value === undefined || value === '' ? DASH : String(value));

// Numeric ID at the end of an API URL (".../pokemon/25/" -> 25).
export const idFromUrl = (url = '') => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export const pageTitle = (h1) => (h1 ? `${h1} – Pokédex` : 'Pokédex');
