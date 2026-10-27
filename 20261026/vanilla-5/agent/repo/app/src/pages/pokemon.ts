import {
  get,
  getResource,
  typeNames,
  type EvolutionChain,
  type EvolutionLink,
  type Move,
  type Pokemon,
  type Species,
  type VersionGroup,
} from '../api';
import { descriptionList, section, typeBadge, typeBadges, type Page } from '../components';
import { h, replaceChildren } from '../dom';
import { english, englishName, humanize, dexNumber, latestFlavorText, MISSING, orMissing } from '../format';
import { sortableTable, type Column } from '../table';
import { updateUrl } from '../url-state';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export async function pokemonPage(name: string, url: URL): Promise<Page> {
  const species = await getResource<Species>('pokemon-species', name);
  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon.url ?? `pokemon/${species.id}/`;
  const [pokemon, chain, types] = await Promise.all([
    get<Pokemon>(defaultVariety),
    species.evolution_chain ? get<EvolutionChain>(species.evolution_chain.url) : null,
    typeNames(),
  ]);
  const typeLabel = (type: string) => types.get(type) ?? humanize(type);
  const title = englishName(species);

  const moves = await movesSection(pokemon, url, typeLabel);

  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;
  const summary = h(
    'div',
    { class: 'summary' },
    h('div', { class: 'artwork' }, artwork && h('img', { src: artwork, alt: title, width: 288, height: 288 })),
    h(
      'div',
      { class: 'summary-info' },
      h('p', { class: 'dex' }, dexNumber(species.id)),
      h('h1', null, title),
      h('p', { class: 'genus' }, english(species.genera)?.genus ?? MISSING),
      typeBadges([...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => ({ name: t.type.name, label: typeLabel(t.type.name) }))),
      descriptionList(
        [
          ['Height', `${(pokemon.height / 10).toFixed(1)} m`],
          ['Weight', `${(pokemon.weight / 10).toFixed(1)} kg`],
        ],
        'facts-inline',
      ),
      h('p', { class: 'flavor' }, latestFlavorText(species.flavor_text_entries) ?? MISSING),
    ),
  );

  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const statRow = (label: string, value: number, max: number) =>
    h(
      'tr',
      null,
      h('th', { scope: 'row' }, label),
      h('td', { class: 'stat-value' }, value),
      h(
        'td',
        { class: 'stat-bar-cell', 'aria-hidden': 'true' },
        h('div', { class: 'stat-track' }, h('div', { class: 'stat-bar', style: `width: ${Math.min(100, (value / max) * 100)}%` })),
      ),
    );
  const stats = section(
    'Base stats',
    {},
    h(
      'table',
      { class: 'stats' },
      h(
        'tbody',
        null,
        pokemon.stats.map((s) => statRow(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, MAX_STAT)),
        statRow('Total', total, MAX_STAT * 6),
      ),
    ),
  );

  const abilities = section(
    'Abilities',
    {},
    h(
      'ul',
      { class: 'plain-links' },
      [...pokemon.abilities]
        .sort((a, b) => a.slot - b.slot)
        .map((a) =>
          h('li', null, h('a', { href: `/abilities/${a.ability.name}` }, humanize(a.ability.name)), a.is_hidden && ' (hidden)'),
        ),
    ),
  );

  const evolutionTree = (link: EvolutionLink): HTMLElement =>
    h(
      'li',
      null,
      h('a', { href: `/pokemon/${link.species.name}`, 'aria-current': link.species.name === species.name ? 'page' : null }, humanize(link.species.name)),
      link.evolves_to.length > 0 && h('ul', null, link.evolves_to.map(evolutionTree)),
    );
  const evolution = section(
    'Evolution',
    {},
    h(
      'ul',
      { class: 'evolution' },
      chain ? evolutionTree(chain.chain) : evolutionTree({ species: { name: species.name, url: '' }, evolves_to: [] }),
    ),
  );

  return {
    title,
    content: [summary, stats, abilities, evolution, moves],
  };
}

interface MoveRow {
  level: number;
  move: Move;
}

async function movesSection(pokemon: Pokemon, url: URL, typeLabel: (type: string) => string): Promise<HTMLElement> {
  const groupRefs = new Map<string, string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) groupRefs.set(d.version_group.name, d.version_group.url);
  }
  const groups = (await Promise.all([...groupRefs.values()].map((u) => get<VersionGroup>(u)))).sort((a, b) => a.order - b.order);

  const container = h('div', { class: 'move-tables' });
  if (!groups.length) {
    return section('Moves', { id: 'moves' }, h('p', null, 'This Pokémon learns no moves.'));
  }

  const requested = url.searchParams.get('game');
  let selected = groups.find((g) => g.name === requested)?.name ?? groups[groups.length - 1].name;
  let token = 0;

  const render = async (group: string) => {
    const current = ++token;
    const tables = await moveTables(pokemon, group, typeLabel);
    if (current === token) replaceChildren(container, tables);
  };

  const gameSelect = h(
    'select',
    {
      id: 'game',
      name: 'game',
      onChange: (event: Event) => {
        selected = (event.target as HTMLSelectElement).value;
        const next = new URL(location.href);
        next.searchParams.set('game', selected);
        updateUrl(next.pathname + next.search + next.hash, true);
        void render(selected);
      },
    },
    groups.map((g) => h('option', { value: g.name, selected: g.name === selected }, humanize(g.name))),
  );

  await render(selected);
  return section('Moves', { id: 'moves' }, h('div', { class: 'field field-inline' }, h('label', { for: 'game' }, 'Game'), gameSelect), container);
}

function methodRank(method: string): [number, string] {
  const i = METHOD_ORDER.indexOf(method);
  return [i === -1 ? METHOD_ORDER.length : i, humanize(method)];
}

async function moveTables(pokemon: Pokemon, group: string, typeLabel: (type: string) => string): Promise<HTMLElement[]> {
  const byMethod = new Map<string, { level: number; url: string }[]>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== group) continue;
      const rows = byMethod.get(d.move_learn_method.name) ?? [];
      if (!rows.some((r) => r.url === m.move.url && r.level === d.level_learned_at)) rows.push({ level: d.level_learned_at, url: m.move.url });
      byMethod.set(d.move_learn_method.name, rows);
    }
  }
  const moveData = new Map<string, Move>();
  const urls = new Set([...byMethod.values()].flat().map((r) => r.url));
  await Promise.all([...urls].map(async (u) => moveData.set(u, await get<Move>(u))));

  const methods = [...byMethod.keys()].sort((a, b) => {
    const [ra, na] = methodRank(a);
    const [rb, nb] = methodRank(b);
    return ra - rb || na.localeCompare(nb);
  });

  return methods.map((method) => {
    const rows: MoveRow[] = byMethod.get(method)!.map((r) => ({ level: r.level, move: moveData.get(r.url)! }));
    const levelUp = method === 'level-up';
    const columns: Column<MoveRow>[] = [
      ...(levelUp ? [{ label: 'Level', value: (r: MoveRow) => r.level, cell: (r: MoveRow) => String(r.level), numeric: true }] : []),
      {
        label: 'Move',
        value: (r) => englishName(r.move),
        cell: (r) => h('a', { href: `/moves/${r.move.name}` }, englishName(r.move)),
      },
      {
        label: 'Type',
        value: (r) => typeLabel(r.move.type.name),
        cell: (r) => typeBadge(r.move.type.name, typeLabel(r.move.type.name)),
      },
      {
        label: 'Category',
        value: (r) => (r.move.damage_class ? humanize(r.move.damage_class.name) : null),
        cell: (r) => orMissing(r.move.damage_class && humanize(r.move.damage_class.name)),
      },
      { label: 'Power', value: (r) => r.move.power, cell: (r) => orMissing(r.move.power), numeric: true },
      { label: 'Accuracy', value: (r) => r.move.accuracy, cell: (r) => orMissing(r.move.accuracy), numeric: true },
      { label: 'PP', value: (r) => r.move.pp, cell: (r) => orMissing(r.move.pp), numeric: true },
    ];
    const byName = (a: MoveRow, b: MoveRow) => englishName(a.move).localeCompare(englishName(b.move));
    rows.sort(levelUp ? (a, b) => a.level - b.level || byName(a, b) : byName);
    return sortableTable(humanize(method), columns, rows);
  });
}
