import {
  dexNumber,
  englishName,
  get,
  getTypeNames,
  humanize,
  latestFlavorText,
  type EvolutionChain,
  type EvolutionLink,
  type Move,
  type Pokemon,
  type Species,
  type VersionGroup,
} from '../api';
import { EM_DASH, pageTitle, typeBadge } from '../components';
import { h, section } from '../dom';
import type { RouteContext, View } from '../router';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

export async function pokemonPage({ params, url, isCurrent }: RouteContext): Promise<View> {
  const species = await get<Species>(`pokemon-species/${encodeURIComponent(params[0].toLowerCase())}`);
  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, typeNames] = await Promise.all([
    get<Pokemon>(defaultVariety?.url ?? `pokemon/${species.id}`),
    species.evolution_chain ? get<EvolutionChain>(species.evolution_chain.url).catch(() => null) : null,
    getTypeNames(),
  ]);
  const moves = await movesSection(pokemon, url, typeNames, isCurrent);

  const name = englishName(species);
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;
  const flavor = latestFlavorText(species.flavor_text_entries);
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot);

  const summary = h(
    'div',
    { class: 'summary' },
    h(
      'div',
      { class: 'summary__art' },
      artwork ? h('img', { src: artwork, alt: name, width: 475, height: 475 }) : null,
    ),
    h(
      'div',
      { class: 'summary__info' },
      h('p', { class: 'summary__number' }, dexNumber(species.id)),
      pageTitle(name),
      genus ? h('p', { class: 'summary__genus' }, genus) : null,
      h(
        'ul',
        { class: 'badge-list', 'aria-label': 'Types' },
        types.map((t) => h('li', null, typeBadge(t.type.name, typeNames.get(t.type.name) ?? humanize(t.type.name)))),
      ),
      h(
        'dl',
        { class: 'facts' },
        h('div', null, h('dt', null, 'Height'), h('dd', null, `${(pokemon.height / 10).toFixed(1)} m`)),
        h('div', null, h('dt', null, 'Weight'), h('dd', null, `${(pokemon.weight / 10).toFixed(1)} kg`)),
      ),
      flavor ? h('p', { class: 'summary__flavor' }, flavor) : null,
    ),
  );

  return {
    title: name,
    node: h(
      'div',
      { class: 'stack' },
      summary,
      statsSection(pokemon),
      abilitiesSection(pokemon),
      evolutionSection(chain, species),
      moves,
    ),
  };
}

function statsSection(pokemon: Pokemon): HTMLElement {
  const bar = (value: number, max: number) =>
    h(
      'td',
      { class: 'stats__bar-cell' },
      h(
        'div',
        { class: 'stats__track', 'aria-hidden': 'true' },
        h('div', { class: 'stats__bar', style: `width: ${Math.min(100, (value / max) * 100).toFixed(2)}%` }),
      ),
    );
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  return section(
    'Base stats',
    null,
    h(
      'table',
      { class: 'stats' },
      h(
        'tbody',
        null,
        pokemon.stats.map((s) =>
          h(
            'tr',
            null,
            h('th', { scope: 'row' }, STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)),
            h('td', { class: 'stats__value' }, s.base_stat),
            bar(s.base_stat, MAX_STAT),
          ),
        ),
        h(
          'tr',
          { class: 'stats__total' },
          h('th', { scope: 'row' }, 'Total'),
          h('td', { class: 'stats__value' }, total),
          bar(total, MAX_STAT * Math.max(1, pokemon.stats.length)),
        ),
      ),
    ),
  );
}

function abilitiesSection(pokemon: Pokemon): HTMLElement {
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  return section(
    'Abilities',
    null,
    abilities.length
      ? h(
          'ul',
          { class: 'bullets' },
          abilities.map((a) =>
            h(
              'li',
              null,
              h('a', { href: `/abilities/${a.ability.name}` }, humanize(a.ability.name)),
              a.is_hidden ? ' (hidden)' : null,
            ),
          ),
        )
      : h('p', null, EM_DASH),
  );
}

function evolutionSection(chain: EvolutionChain | null, species: Species): HTMLElement {
  const root: EvolutionLink = chain?.chain ?? { species: { name: species.name, url: '' }, evolves_to: [] };
  const list = (links: EvolutionLink[]): HTMLUListElement =>
    h(
      'ul',
      { class: 'bullets evolution' },
      links.map((link) =>
        h(
          'li',
          null,
          h(
            'a',
            {
              href: `/pokemon/${link.species.name}`,
              'aria-current': link.species.name === species.name ? 'page' : null,
            },
            humanize(link.species.name),
          ),
          link.evolves_to.length ? list(link.evolves_to) : null,
        ),
      ),
    );
  return section('Evolution', null, list([root]));
}

// ---- Moves -------------------------------------------------------------------

interface MoveRow {
  level: number | null;
  name: string;
  slug: string;
  type: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type ColumnKey = 'level' | 'name' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';

const COLUMNS: { key: ColumnKey; label: string; numeric?: boolean }[] = [
  { key: 'level', label: 'Level', numeric: true },
  { key: 'name', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodRank(method: string): [number, string] {
  const i = METHOD_ORDER.indexOf(method);
  return [i === -1 ? METHOD_ORDER.length : i, humanize(method)];
}

async function movesSection(
  pokemon: Pokemon,
  url: URL,
  typeNames: Map<string, string>,
  isCurrent: () => boolean,
): Promise<HTMLElement> {
  const groupNames = new Map<string, string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) groupNames.set(d.version_group.name, d.version_group.url);
  }
  const groups = (await Promise.all([...groupNames.values()].map((u) => get<VersionGroup>(u)))).sort(
    (a, b) => a.order - b.order,
  );

  const requested = url.searchParams.get('game');
  let selected = groups.find((g) => g.name === requested)?.name ?? groups.at(-1)?.name ?? '';

  const tables = h('div', { class: 'stack stack--tight' });
  const select = h(
    'select',
    { id: 'game-select', class: 'input input--inline' },
    groups.map((g) => h('option', { value: g.name }, humanize(g.name))),
  );
  select.value = selected;

  let renderToken = 0;
  const renderTables = async () => {
    const token = ++renderToken;
    const nodes = await buildTables(pokemon, selected, typeNames);
    if (token === renderToken) tables.replaceChildren(...nodes);
  };

  select.addEventListener('change', () => {
    selected = select.value;
    const next = new URL(location.href);
    next.searchParams.set('game', selected);
    history.replaceState(null, '', next);
    tables.setAttribute('aria-busy', 'true');
    renderTables()
      .catch((err) => console.error(err))
      .finally(() => tables.removeAttribute('aria-busy'));
  });

  if (selected) await renderTables();
  if (!isCurrent()) return h('div');

  return section(
    'Moves',
    { id: 'moves' },
    groups.length
      ? [
          h(
            'div',
            { class: 'field field--inline' },
            h('label', { for: 'game-select', class: 'field__label' }, 'Game'),
            select,
          ),
          tables,
        ]
      : h('p', null, 'This Pokémon learns no moves.'),
  );
}

async function buildTables(pokemon: Pokemon, group: string, typeNames: Map<string, string>): Promise<HTMLElement[]> {
  const byMethod = new Map<string, { move: string; url: string; level: number }[]>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== group) continue;
      const method = d.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method)!.push({ move: m.move.name, url: m.move.url, level: d.level_learned_at });
    }
  }
  const moveRecords = new Map<string, Move>();
  const urls = new Set([...byMethod.values()].flat().map((e) => e.url));
  await Promise.all(
    [...urls].map(async (u) => {
      moveRecords.set(u, await get<Move>(u));
    }),
  );

  const methods = [...byMethod.keys()].sort((a, b) => {
    const [ra, na] = methodRank(a);
    const [rb, nb] = methodRank(b);
    return ra - rb || na.localeCompare(nb);
  });

  return methods.map((method) => {
    const isLevelUp = method === 'level-up';
    const seen = new Set<string>();
    const rows: MoveRow[] = [];
    for (const entry of byMethod.get(method)!) {
      const key = `${entry.move}:${isLevelUp ? entry.level : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const move = moveRecords.get(entry.url)!;
      rows.push({
        level: isLevelUp ? entry.level : null,
        name: englishName(move),
        slug: move.name,
        type: move.type.name,
        typeLabel: typeNames.get(move.type.name) ?? humanize(move.type.name),
        category: move.damage_class ? humanize(move.damage_class.name) : EM_DASH,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      });
    }
    const columns = isLevelUp ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');
    return movesTable(humanize(method), columns, rows);
  });
}

function compareRows(a: MoveRow, b: MoveRow, key: ColumnKey, dir: 1 | -1): number {
  const va = a[key];
  const vb = b[key];
  const missingA = va === null || va === EM_DASH;
  const missingB = vb === null || vb === EM_DASH;
  if (missingA || missingB) {
    if (missingA && missingB) return a.name.localeCompare(b.name);
    return missingA ? 1 : -1;
  }
  const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
  return cmp * dir || a.name.localeCompare(b.name);
}

function movesTable(caption: string, columns: typeof COLUMNS, rows: MoveRow[]): HTMLElement {
  const defaultOrder = (a: MoveRow, b: MoveRow) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name);
  let sort: { key: ColumnKey; dir: 1 | -1 } | null = null;

  const tbody = h('tbody');
  const headers = columns.map((col) => {
    const th = h('th', { scope: 'col', class: col.numeric ? 'num' : null });
    const button = h('button', { type: 'button', class: 'sort-button' }, col.label);
    button.addEventListener('click', () => {
      sort = sort?.key === col.key ? { key: col.key, dir: sort.dir === 1 ? -1 : 1 } : { key: col.key, dir: 1 };
      renderBody();
    });
    th.append(button);
    return { th, col };
  });

  const renderBody = () => {
    const sorted = [...rows].sort(sort ? (a, b) => compareRows(a, b, sort!.key, sort!.dir) : defaultOrder);
    for (const { th, col } of headers) {
      if (sort?.key === col.key) th.setAttribute('aria-sort', sort.dir === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    }
    const value = (v: number | null) => (v === null ? EM_DASH : v);
    tbody.replaceChildren(
      ...sorted.map((row) =>
        h(
          'tr',
          null,
          columns.map((col) => {
            switch (col.key) {
              case 'level':
                return h('td', { class: 'num' }, value(row.level));
              case 'name':
                return h('td', null, h('a', { href: `/moves/${row.slug}` }, row.name));
              case 'typeLabel':
                return h('td', null, typeBadge(row.type, row.typeLabel));
              case 'category':
                return h('td', null, row.category);
              default:
                return h('td', { class: 'num' }, value(row[col.key]));
            }
          }),
        ),
      ),
    );
  };
  renderBody();

  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table' },
      h('caption', null, caption),
      h('thead', null, h('tr', null, headers.map((x) => x.th))),
      tbody,
    ),
  );
}
