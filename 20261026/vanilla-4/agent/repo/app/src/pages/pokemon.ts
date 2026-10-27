import {
  dexNumber,
  englishName,
  get,
  humanize,
  latestFlavorText,
  typeNames,
  versionGroups,
  type ChainLink,
  type Move,
  type Pokemon,
  type Species,
} from '../api';
import { typeBadge } from '../components';
import { DASH, h, orDash, section } from '../dom';
import { updateUrl } from '../nav';

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

export async function pokemonPage([name]: string[], url: URL): Promise<Node> {
  const species = await get<Species>(`pokemon-species/${encodeURIComponent(name)}`);
  const defaultRef = species.varieties.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, types, groups] = await Promise.all([
    get<Pokemon>(defaultRef ? defaultRef.url : `pokemon/${species.id}`),
    species.evolution_chain ? get<{ chain: ChainLink }>(species.evolution_chain.url).catch(() => null) : null,
    typeNames(),
    versionGroups(),
  ]);
  const title = englishName(species);
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;

  const summary = h(
    'div',
    { class: 'pokemon-summary' },
    h(
      'div',
      { class: 'artwork card' },
      artwork && h('img', { src: artwork, alt: title, width: 475, height: 475 }),
    ),
    h(
      'div',
      { class: 'summary-info' },
      h('p', { class: 'dex' }, dexNumber(species.id)),
      h('h1', null, title),
      genus && h('p', { class: 'genus' }, genus),
      h(
        'p',
        { class: 'types' },
        [...pokemon.types]
          .sort((a, b) => a.slot - b.slot)
          .map((t) => typeBadge(t.type.name, types.get(t.type.name) ?? humanize(t.type.name))),
      ),
      h(
        'dl',
        { class: 'measurements' },
        h('div', null, h('dt', null, 'Height'), h('dd', null, `${(pokemon.height / 10).toFixed(1)} m`)),
        h('div', null, h('dt', null, 'Weight'), h('dd', null, `${(pokemon.weight / 10).toFixed(1)} kg`)),
      ),
      flavor && h('p', { class: 'flavor' }, flavor),
    ),
  );

  return h(
    'div',
    { class: 'stack' },
    summary,
    statsSection(pokemon),
    abilitiesSection(pokemon),
    evolutionSection(chain?.chain, species),
    await movesSection(pokemon, url, types, groups),
  );
}

function statsSection(pokemon: Pokemon) {
  const bar = (value: number, max: number) =>
    h(
      'td',
      { class: 'stat-bar', 'aria-hidden': 'true' },
      h('span', { class: 'track' }, h('span', { class: 'fill', style: `width: ${Math.min(100, (value / max) * 100)}%` })),
    );
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  return section(
    'Base stats',
    {},
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
            h('td', { class: 'stat-value' }, s.base_stat),
            bar(s.base_stat, MAX_STAT),
          ),
        ),
        h(
          'tr',
          { class: 'total' },
          h('th', { scope: 'row' }, 'Total'),
          h('td', { class: 'stat-value' }, total),
          bar(total, MAX_STAT * Math.max(1, pokemon.stats.length)),
        ),
      ),
    ),
  );
}

function abilitiesSection(pokemon: Pokemon) {
  return section(
    'Abilities',
    {},
    h(
      'ul',
      { class: 'plain-list' },
      [...pokemon.abilities]
        .sort((a, b) => a.slot - b.slot)
        .map((a) =>
          h(
            'li',
            null,
            h('a', { href: `/abilities/${a.ability.name}` }, humanize(a.ability.name)),
            a.is_hidden && ' (hidden)',
          ),
        ),
    ),
  );
}

function evolutionSection(chain: ChainLink | undefined, species: Species) {
  const item = (link: ChainLink): HTMLLIElement =>
    h(
      'li',
      null,
      h('a', { href: `/pokemon/${link.species.name}` }, humanize(link.species.name)),
      link.evolves_to.length > 0 && h('ul', null, link.evolves_to.map(item)),
    );
  const root: ChainLink = chain ?? { species: { name: species.name, url: '' }, evolves_to: [] };
  return section('Evolution', {}, h('ul', { class: 'evolution' }, item(root)));
}

interface MoveRow {
  level: number;
  move: Move;
  name: string;
  typeName: string;
  typeLabel: string;
  category: string | null;
}

type Column = {
  key: string;
  label: string;
  value: (r: MoveRow) => number | string | null;
  cell: (r: MoveRow) => Node | string;
};

const COLUMNS: Column[] = [
  { key: 'level', label: 'Level', value: (r) => r.level, cell: (r) => String(r.level) },
  {
    key: 'move',
    label: 'Move',
    value: (r) => r.name,
    cell: (r) => h('a', { href: `/moves/${r.move.name}` }, r.name),
  },
  { key: 'type', label: 'Type', value: (r) => r.typeLabel, cell: (r) => typeBadge(r.typeName, r.typeLabel) },
  { key: 'category', label: 'Category', value: (r) => r.category, cell: (r) => orDash(r.category) },
  { key: 'power', label: 'Power', value: (r) => r.move.power, cell: (r) => orDash(r.move.power) },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.move.accuracy, cell: (r) => orDash(r.move.accuracy) },
  { key: 'pp', label: 'PP', value: (r) => r.move.pp, cell: (r) => orDash(r.move.pp) },
];

function compareValues(a: number | string | null, b: number | string | null): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function movesTable(method: string, rows: MoveRow[]) {
  const columns = method === 'level-up' ? COLUMNS : COLUMNS.slice(1);
  const byName = (a: MoveRow, b: MoveRow) => a.name.localeCompare(b.name);
  const defaultOrder =
    method === 'level-up' ? [...rows].sort((a, b) => a.level - b.level || byName(a, b)) : [...rows].sort(byName);

  let sortKey: string | null = null;
  let direction: 'ascending' | 'descending' = 'ascending';
  const tbody = h('tbody');
  const headers = new Map<string, HTMLTableCellElement>();

  function renderRows() {
    let sorted = defaultOrder;
    const col = columns.find((c) => c.key === sortKey);
    if (col) {
      const sign = direction === 'ascending' ? 1 : -1;
      sorted = [...defaultOrder].sort((a, b) => {
        const va = col.value(a);
        const vb = col.value(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return sign * compareValues(va, vb);
      });
    }
    tbody.replaceChildren(...sorted.map((r) => h('tr', null, columns.map((c) => h('td', { class: `col-${c.key}` }, c.cell(r))))));
    for (const [key, th] of headers) {
      if (key === sortKey) th.setAttribute('aria-sort', direction);
      else th.removeAttribute('aria-sort');
    }
  }

  const headRow = h(
    'tr',
    null,
    columns.map((c) => {
      const th = h(
        'th',
        { scope: 'col', class: `col-${c.key}` },
        h(
          'button',
          {
            type: 'button',
            class: 'sort-button',
            onclick: (() => {
              if (sortKey === c.key) direction = direction === 'ascending' ? 'descending' : 'ascending';
              else {
                sortKey = c.key;
                direction = 'ascending';
              }
              renderRows();
            }) as EventListener,
          },
          c.label,
        ),
      );
      headers.set(c.key, th);
      return th;
    }),
  );

  renderRows();
  return h(
    'div',
    { class: 'table-scroll' },
    h('table', { class: 'moves-table' }, h('caption', null, humanize(method)), h('thead', null, headRow), tbody),
  );
}

async function movesSection(
  pokemon: Pokemon,
  url: URL,
  types: Map<string, string>,
  groups: Map<string, { name: string; order: number }>,
) {
  const available = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) available.add(d.version_group.name);
  const games = [...available].sort(
    (a, b) => (groups.get(a)?.order ?? Infinity) - (groups.get(b)?.order ?? Infinity) || a.localeCompare(b),
  );

  const requested = url.searchParams.get('game');
  let selected = requested && available.has(requested) ? requested : games[games.length - 1];

  const tables = h('div', { class: 'moves-tables' });

  async function buildTables(game: string): Promise<Node[]> {
    const entries: { level: number; method: string; ref: { name: string; url: string } }[] = [];
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== game) continue;
        entries.push({ level: d.level_learned_at, method: d.move_learn_method.name, ref: m.move });
      }
    }
    const moves = await Promise.all(entries.map((e) => get<Move>(e.ref.url)));
    const byMethod = new Map<string, MoveRow[]>();
    entries.forEach((e, i) => {
      const move = moves[i];
      const rows = byMethod.get(e.method) ?? [];
      rows.push({
        level: e.level,
        move,
        name: englishName(move),
        typeName: move.type.name,
        typeLabel: types.get(move.type.name) ?? humanize(move.type.name),
        category: move.damage_class ? humanize(move.damage_class.name) : null,
      });
      byMethod.set(e.method, rows);
    });
    const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
    const methods = [...byMethod.keys()].sort((a, b) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)));
    if (!methods.length) return [h('p', null, DASH)];
    return methods.map((m) => movesTable(m, byMethod.get(m)!));
  }

  const select = h(
    'select',
    { id: 'game', name: 'game' },
    games.map((g) => h('option', { value: g }, humanize(g))),
  );
  if (selected) select.value = selected;

  let token = 0;
  select.addEventListener('change', async () => {
    selected = select.value;
    const next = new URL(location.href);
    next.searchParams.set('game', selected);
    updateUrl(next, true);
    const t = ++token;
    const nodes = await buildTables(selected);
    if (t === token) tables.replaceChildren(...nodes);
  });

  if (selected) tables.replaceChildren(...(await buildTables(selected)));
  else tables.replaceChildren(h('p', null, 'No moves.'));

  return section(
    'Moves',
    { id: 'moves' },
    games.length > 0 && h('div', { class: 'field field-inline' }, h('label', { for: 'game' }, 'Game'), select),
    tables,
  );
}
