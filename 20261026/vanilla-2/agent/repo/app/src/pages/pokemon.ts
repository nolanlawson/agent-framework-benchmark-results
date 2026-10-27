import {
  englishGenus,
  englishName,
  get,
  getMove,
  getPokemon,
  getSpecies,
  getTypeNames,
  getVersionGroup,
  humanize,
  latestFlavorText,
  type ChainLink,
  type EvolutionChain,
  type Pokemon,
} from '../api';
import { dexNumber, MISSING, section, typeBadge } from '../components';
import { html, SafeHtml } from '../html';
import { updateUrl, type Page, type PageContext } from '../router';

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

// ---- Summary sections ----

function statsTable(pokemon: Pokemon): SafeHtml {
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const row = (label: string, value: number, max: number, extraClass = '') => html`<tr class="${extraClass}">
    <th scope="row">${label}</th>
    <td class="stats__value">${value}</td>
    <td class="stats__bar-cell"><div class="stats__bar" aria-hidden="true"><div style="width: ${Math.min(100, (value / max) * 100).toFixed(1)}%"></div></div></td>
  </tr>`;
  return html`<table class="stats">
    <tbody>
      ${pokemon.stats.map((s) => row(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, MAX_STAT))}
      ${row('Total', total, MAX_STAT * Math.max(pokemon.stats.length, 1), 'stats__total')}
    </tbody>
  </table>`;
}

function abilitiesList(pokemon: Pokemon): SafeHtml {
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  return html`<ul class="bullets">
    ${abilities.map(
      (a) => html`<li><a href="/abilities/${a.ability.name}">${humanize(a.ability.name)}</a>${a.is_hidden ? ' (hidden)' : ''}</li>`,
    )}
  </ul>`;
}

function evolutionTree(link: ChainLink): SafeHtml {
  return html`<li>
    <a href="/pokemon/${link.species.name}">${humanize(link.species.name)}</a>
    ${link.evolves_to.length > 0 && html`<ul>${link.evolves_to.map(evolutionTree)}</ul>`}
  </li>`;
}

// ---- Moves ----

interface MoveRow {
  level: number;
  name: string;
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type Column = 'level' | 'label' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'label', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

interface MoveTable {
  method: string;
  rows: MoveRow[]; // in default order
  sort?: { key: Column; dir: 'ascending' | 'descending' };
}

const byLabel = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

function methodRank(method: string) {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

async function loadMoveTables(pokemon: Pokemon, versionGroup: string): Promise<MoveTable[]> {
  const learned = pokemon.moves.flatMap(({ move, version_group_details }) =>
    version_group_details
      .filter((d) => d.version_group.name === versionGroup)
      .map((d) => ({ move: move.name, method: d.move_learn_method.name, level: d.level_learned_at })),
  );
  const [typeNames, moves] = await Promise.all([
    getTypeNames(),
    Promise.all([...new Set(learned.map((l) => l.move))].map((name) => getMove(name))),
  ]);
  const moveByName = new Map(moves.map((m) => [m.name, m]));

  const tables = new Map<string, MoveRow[]>();
  for (const { move: name, method, level } of learned) {
    const move = moveByName.get(name)!;
    const rows = tables.get(method) ?? [];
    rows.push({
      level,
      name,
      label: englishName(move),
      type: move.type.name,
      typeLabel: typeNames.get(move.type.name) ?? humanize(move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    });
    tables.set(method, rows);
  }
  return [...tables]
    .map(([method, rows]) => ({
      method,
      rows: rows.sort(method === 'level-up' ? (a, b) => a.level - b.level || byLabel(a, b) : byLabel),
    }))
    .sort((a, b) => methodRank(a.method) - methodRank(b.method) || humanize(a.method).localeCompare(humanize(b.method)));
}

function sortedRows(table: MoveTable): MoveRow[] {
  if (!table.sort) return table.rows;
  const { key, dir } = table.sort;
  const sign = dir === 'ascending' ? 1 : -1;
  return [...table.rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // missing values last
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
}

const show = (value: number | string | null) => (value == null ? MISSING : value);

function moveTable(table: MoveTable, index: number): SafeHtml {
  const columns = COLUMNS.filter((c) => c.key !== 'level' || table.method === 'level-up');
  return html`<div class="table-scroll">
    <table class="moves-table" data-table="${index}">
      <caption>${humanize(table.method)}</caption>
      <thead>
        <tr>
          ${columns.map((c) => {
            const sorted = table.sort?.key === c.key ? table.sort.dir : null;
            return html`<th scope="col" ${sorted ? html`aria-sort="${sorted}"` : ''}>
              <button type="button" class="sort-button" data-column="${c.key}">${c.label}<span class="sort-indicator" aria-hidden="true">${
                sorted === 'ascending' ? '▲' : sorted === 'descending' ? '▼' : ''
              }</span></button>
            </th>`;
          })}
        </tr>
      </thead>
      <tbody>
        ${sortedRows(table).map(
          (r) => html`<tr>
            ${table.method === 'level-up' && html`<td>${r.level}</td>`}
            <td><a href="/moves/${r.name}">${r.label}</a></td>
            <td>${typeBadge(r.type, r.typeLabel)}</td>
            <td>${show(r.category)}</td>
            <td>${show(r.power)}</td>
            <td>${show(r.accuracy)}</td>
            <td>${show(r.pp)}</td>
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
}

const moveTables = (tables: MoveTable[]) =>
  tables.length ? html`${tables.map(moveTable)}` : html`<p>${MISSING}</p>`;

// ---- Page ----

export async function pokemonPage({ url, params: [name], isCurrent }: PageContext): Promise<Page> {
  const species = await getSpecies(name);
  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, typeNames] = await Promise.all([
    getPokemon(defaultVariety ? defaultVariety.name : species.id),
    species.evolution_chain ? get<EvolutionChain>(species.evolution_chain.url) : Promise.resolve(null),
    getTypeNames(),
  ]);

  const versionGroups = (
    await Promise.all(
      [...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))].map((vg) =>
        getVersionGroup(vg),
      ),
    )
  ).sort((a, b) => a.order - b.order);
  const requested = url.searchParams.get('game');
  let selected = versionGroups.find((vg) => vg.name === requested)?.name ?? versionGroups[versionGroups.length - 1]?.name;
  let tables = selected ? await loadMoveTables(pokemon, selected) : [];

  const title = englishName(species);
  const genus = englishGenus(species);
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot);

  const movesBody = html`${
    versionGroups.length > 0 &&
    html`<div class="game-field">
      <label for="game-select">Game</label>
      <select id="game-select">
        ${versionGroups.map((vg) => html`<option value="${vg.name}" ${vg.name === selected ? 'selected' : ''}>${humanize(vg.name)}</option>`)}
      </select>
    </div>`
  }
    <div class="move-tables">${moveTables(tables)}</div>`;

  return {
    title,
    body: html`<div class="hero">
        <div class="hero__art">${artwork && html`<img src="${artwork}" alt="${title}" width="475" height="475" />`}</div>
        <div class="hero__info">
          <p class="hero__number">${dexNumber(species.id)}</p>
          <h1>${title}</h1>
          ${genus && html`<p class="hero__genus">${genus}</p>`}
          <p class="badges">${types.map((t) => typeBadge(t.type.name, typeNames.get(t.type.name) ?? humanize(t.type.name)))}</p>
          <dl class="facts">
            <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
            <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
          </dl>
          ${flavor && html`<p class="hero__flavor">${flavor}</p>`}
        </div>
      </div>
      ${section('stats', 'Base stats', statsTable(pokemon))}
      ${section('abilities', 'Abilities', abilitiesList(pokemon))}
      ${section('evolution', 'Evolution', chain ? html`<ul class="bullets evolution">${evolutionTree(chain.chain)}</ul>` : html`<p>${MISSING}</p>`)}
      ${section('moves', 'Moves', movesBody, ' id="moves"')}`,
    mount(main) {
      const container = main.querySelector<HTMLElement>('.move-tables')!;
      const select = main.querySelector<HTMLSelectElement>('#game-select');

      select?.addEventListener('change', async () => {
        const game = select.value;
        selected = game;
        const next = new URL(location.href);
        next.searchParams.set('game', game);
        updateUrl(next.pathname + next.search + next.hash);
        container.setAttribute('aria-busy', 'true');
        const loaded = await loadMoveTables(pokemon, game);
        if (!isCurrent() || selected !== game) return;
        tables = loaded;
        container.removeAttribute('aria-busy');
        container.innerHTML = moveTables(tables).value;
      });

      container.addEventListener('click', (event) => {
        // Clicks anywhere in a column header sort by that column.
        const button = (event.target as Element).closest('thead th')?.querySelector<HTMLButtonElement>('.sort-button');
        const tableEl = button?.closest<HTMLTableElement>('table');
        if (!button || !tableEl) return;
        const index = Number(tableEl.dataset.table);
        const table = tables[index];
        const key = button.dataset.column as Column;
        const dir = table.sort?.key === key && table.sort.dir === 'ascending' ? 'descending' : 'ascending';
        table.sort = { key, dir };
        tableEl.closest('.table-scroll')!.outerHTML = moveTable(table, index).value;
        container.querySelector<HTMLButtonElement>(`table[data-table="${index}"] [data-column="${key}"]`)?.focus();
      });
    },
  };
}
