import { API_BASE_URL, find, get, list } from './api.js';

type Named = { name: string; url: string };
type LocalName = { name: string; language: { name: string } };

export const ALT_FORM_MIN_ID = 10000;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export const englishName = (names: LocalName[] | undefined, fallback: string): string =>
  names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number): string => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined) {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishShortEffect(entries: { short_effect: string; language: { name: string } }[] | undefined, chance?: number | null) {
  const text = entries?.find((e) => e.language.name === 'en')?.short_effect;
  if (!text) return null;
  return text.replace(/\$effect_chance/g, chance == null ? '' : String(chance)).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Species index

export type SpeciesRef = { id: number; name: string };

export async function speciesIndex(): Promise<{ all: SpeciesRef[]; byId: Map<number, SpeciesRef> }> {
  const results = await list('pokemon-species');
  const all = results
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((s) => s.id && s.id < ALT_FORM_MIN_ID)
    .sort((a, b) => a.id - b.id);
  return { all, byId: new Map(all.map((s) => [s.id, s])) };
}

// ---------------------------------------------------------------------------
// Types

export type TypeInfo = { name: string; label: string; detail: any };

export async function typeIndex(): Promise<{ all: TypeInfo[]; byName: Map<string, TypeInfo>; byPokemon: Map<number, string[]> }> {
  const results = (await list('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const details = await Promise.all(results.map((t) => get(t.url)));
  const all = details.map((d, i) => ({ name: results[i].name, label: englishName(d.names, results[i].name), detail: d }));
  const slots = new Map<number, { slot: number; type: string }[]>();
  for (const t of all) {
    for (const p of t.detail.pokemon as { slot: number; pokemon: Named }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (id >= ALT_FORM_MIN_ID) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id)!.push({ slot: p.slot, type: t.name });
    }
  }
  const byPokemon = new Map<number, string[]>();
  for (const [id, s] of slots) byPokemon.set(id, s.sort((a, b) => a.slot - b.slot).map((x) => x.type));
  return { all, byName: new Map(all.map((t) => [t.name, t])), byPokemon };
}

export const typeLabel = (types: Map<string, TypeInfo>, name: string) => types.get(name)?.label ?? humanize(name);

// ---------------------------------------------------------------------------
// Generations

export type GenerationInfo = { name: string; label: string; species: Set<number> };

export async function generations(): Promise<GenerationInfo[]> {
  const results = await list('generation');
  const details = await Promise.all(results.map((g) => get(g.url)));
  return details.map((d, i) => ({
    name: results[i].name,
    label: englishName(d.names, results[i].name),
    species: new Set((d.pokemon_species as Named[]).map((s) => idFromUrl(s.url))),
  }));
}

// ---------------------------------------------------------------------------
// Version groups

export async function versionGroupOrders(): Promise<Map<string, number>> {
  const results = await list('version-group');
  const details = await Promise.all(results.map((v) => get(v.url)));
  return new Map(details.map((d, i) => [results[i].name, d.order as number]));
}

// ---------------------------------------------------------------------------
// Pokémon references → species cards

export type CardData = { id: number; name: string; types?: string[]; hidden?: boolean };

/** Maps Pokémon references (from type/move/ability data) to species, dropping alternate forms. */
export async function cardsForPokemon<T extends { pokemon: Named }>(refs: T[], extra?: (ref: T) => Partial<CardData>): Promise<CardData[]> {
  const { byId } = await speciesIndex();
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (id >= ALT_FORM_MIN_ID || seen.has(id)) continue;
    seen.add(id);
    const species = byId.get(id);
    cards.push({ id, name: species?.name ?? ref.pokemon.name, ...extra?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

export { find, get };
