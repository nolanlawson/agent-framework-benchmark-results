// A Pokémon's moves: a game picker plus one sortable table per learn method.
import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { live } from 'lit/directives/live.js';

import { humanize, orMissing } from '../lib/format.js';
import { typeBadge } from '../lib/templates.js';
import componentStyles from '../styles/components.css?inline';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const COLUMNS = [
  { key: 'level', label: 'Level', numeric: true, levelOnly: true },
  { key: 'label', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

const isMissing = (value) => value === null || value === undefined || value === '';
const byName = (a, b) => a.label.localeCompare(b.label);

function compareBy(column, direction) {
  const sign = direction === 'descending' ? -1 : 1;
  return (a, b) => {
    const x = a[column.key];
    const y = b[column.key];
    // Missing values sort last in both directions.
    if (isMissing(x) || isMissing(y)) return isMissing(x) - isMissing(y) || byName(a, b);
    const order = column.numeric ? x - y : String(x).localeCompare(String(y));
    return sign * order || byName(a, b);
  };
}

function methodRank(method) {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
}

export class PokemonMoves extends LitElement {
  static properties = {
    data: { type: Object },
    game: {},
    sorting: { state: true },
  };

  static styles = [
    unsafeCSS(componentStyles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  constructor() {
    super();
    this.data = { groups: [], moves: {}, learn: {} };
    this.game = '';
    this.sorting = {};
  }

  #selectGame(game) {
    this.game = game;
    const url = new URL(location.href);
    url.searchParams.set('game', game);
    history.replaceState(null, '', url);
  }

  #toggleSort(method, key) {
    const current = this.sorting[method];
    const direction = current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending';
    this.sorting = { ...this.sorting, [method]: { key, direction } };
  }

  #tables() {
    const byMethod = new Map();
    for (const [move, method, level] of this.data.learn[this.game] ?? []) {
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method).push({ name: move, level, ...this.data.moves[move] });
    }
    return [...byMethod.entries()]
      .map(([method, rows]) => ({ method, label: humanize(method), rows }))
      .sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));
  }

  #table({ method, label, rows }) {
    const columns = COLUMNS.filter((c) => !c.levelOnly || method === 'level-up');
    const sort = this.sorting[method];
    const sortColumn = sort && columns.find((c) => c.key === sort.key);
    const sorted = [...rows].sort(
      sortColumn
        ? compareBy(sortColumn, sort.direction)
        : method === 'level-up'
          ? (a, b) => a.level - b.level || byName(a, b)
          : byName,
    );

    return html`
      <div class="table-scroll">
        <table class="moves-table">
          <caption>${label}</caption>
          <thead>
            <tr>
              ${columns.map((column) => {
                const direction = sortColumn === column ? sort.direction : null;
                return html`<th scope="col" aria-sort=${direction ?? nothing}>
                  <button type="button" class="sort-button" @click=${() => this.#toggleSort(method, column.key)}>
                    ${column.label}<span class="sort-indicator" aria-hidden="true"
                      >${direction === 'ascending' ? '▲' : direction === 'descending' ? '▼' : ''}</span
                    >
                  </button>
                </th>`;
              })}
            </tr>
          </thead>
          <tbody>
            ${sorted.map(
              (row) => html`<tr>
                ${method === 'level-up' ? html`<td>${row.level}</td>` : nothing}
                <td><a href="/moves/${row.name}">${row.label}</a></td>
                <td>${row.type ? typeBadge({ name: row.type, label: row.typeLabel }, { link: true }) : '—'}</td>
                <td>${orMissing(row.category)}</td>
                <td>${orMissing(row.power)}</td>
                <td>${orMissing(row.accuracy)}</td>
                <td>${orMissing(row.pp)}</td>
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  render() {
    const { groups } = this.data;
    if (!groups.length) return html`<p>This Pokémon learns no moves.</p>`;
    return html`
      <div class="field field--inline">
        <label for="game">Game</label>
        <select id="game" .value=${live(this.game)} @change=${(e) => this.#selectGame(e.target.value)}>
          ${groups.map((g) => html`<option value=${g.name} ?selected=${g.name === this.game}>${g.label}</option>`)}
        </select>
      </div>
      ${this.#tables().map((table) => this.#table(table))}
    `;
  }
}

customElements.define('pokemon-moves', PokemonMoves);
