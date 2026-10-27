import { createAsync, useParams, useSearchParams } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { NotFound, PageTitle, Section, TypeBadge } from "~/components/ui";
import { dexNumber, EM_DASH, humanize, orDash } from "~/lib/format";
import { getLearnset, getPokemon } from "~/lib/queries";
import type { EvolutionNode, LearnTable, MoveRow, PokemonDetail } from "~/lib/types";

const MAX_STAT = 255;

export default function PokemonPage() {
  const params = useParams<{ name: string }>();
  const pokemon = createAsync(() => getPokemon(params.name), { deferStream: true });

  return (
    <Show when={pokemon() !== undefined}>
      <Show when={pokemon()} fallback={<NotFound />}>
        {(p) => <Pokemon pokemon={p()} />}
      </Show>
    </Show>
  );
}

function Pokemon(props: { pokemon: PokemonDetail }) {
  const p = () => props.pokemon;
  const total = () => p().stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <PageTitle heading={p().label} />
      <div class="summary">
        <div class="artwork">
          <Show when={p().artwork}>
            <img src={p().artwork!} alt={p().label} width="475" height="475" />
          </Show>
        </div>
        <div class="summary-text">
          <p class="dex-number">{dexNumber(p().id)}</p>
          <h1>{p().label}</h1>
          <Show when={p().genus}>
            <p class="genus">{p().genus}</p>
          </Show>
          <p class="badges">
            <For each={p().types}>{(t) => <TypeBadge type={t} />}</For>
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(p().height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(p().weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <Show when={p().flavorText}>
            <p class="flavor">{p().flavorText}</p>
          </Show>
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats">
          <tbody>
            <For each={p().stats}>
              {(s) => <StatRow label={s.label} value={s.value} max={MAX_STAT} />}
            </For>
          </tbody>
          <tfoot>
            <StatRow label="Total" value={total()} max={MAX_STAT * Math.max(1, p().stats.length)} />
          </tfoot>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="bullets">
          <For each={p().abilities}>
            {(a) => (
              <li>
                <a href={`/abilities/${a.name}`}>{humanize(a.name)}</a>
                {a.hidden ? " (hidden)" : ""}
              </li>
            )}
          </For>
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <Show when={p().evolution}>{(root) => <Evolution nodes={[root()]} />}</Show>
      </Section>

      <Moves pokemon={p()} />
    </>
  );
}

function StatRow(props: { label: string; value: number; max: number }) {
  return (
    <tr>
      <th scope="row">{props.label}</th>
      <td class="stat-value">{props.value}</td>
      <td class="stat-bar" aria-hidden="true">
        <span class="bar">
          <span style={{ width: `${Math.min(100, (props.value / props.max) * 100)}%` }} />
        </span>
      </td>
    </tr>
  );
}

function Evolution(props: { nodes: EvolutionNode[] }) {
  return (
    <ul class="bullets evolution">
      <For each={props.nodes}>
        {(node) => (
          <li>
            <a href={`/pokemon/${node.name}`}>{humanize(node.name)}</a>
            <Show when={node.children.length}>
              <Evolution nodes={node.children} />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

function Moves(props: { pokemon: PokemonDetail }) {
  const [params, setParams] = useSearchParams<{ game?: string }>();
  const game = () => {
    const games = props.pokemon.games;
    return games.find((g) => g.name === params.game)?.name ?? games[games.length - 1]?.name;
  };
  const tables = createAsync(
    async () => {
      const g = game();
      return g ? getLearnset(props.pokemon.pokemonName, g) : [];
    },
    { deferStream: true },
  );

  return (
    <Section id="moves" title="Moves" class="moves">
      <Show when={props.pokemon.games.length} fallback={<p>{EM_DASH}</p>}>
        <div class="field field-inline">
          <label for="game">Game</label>
          <select id="game" onChange={(e) => setParams({ game: e.currentTarget.value }, { scroll: false })}>
            <For each={props.pokemon.games}>
              {(g) => (
                <option value={g.name} selected={g.name === game()}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <For each={tables()}>{(table) => <MoveTable table={table} />}</For>
      </Show>
    </Section>
  );
}

type SortKey = "level" | "label" | "type" | "category" | "power" | "accuracy" | "pp";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "label", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function sortValue(row: MoveRow, key: SortKey): string | number | null {
  return key === "type" ? row.type.label : row[key];
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function MoveTable(props: { table: LearnTable }) {
  const [sort, setSort] = createSignal<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const isLevelUp = () => props.table.method === "level-up";
  const columns = () => (isLevelUp() ? COLUMNS : COLUMNS.slice(1));
  const byDefault = (a: MoveRow, b: MoveRow) =>
    (isLevelUp() ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label);

  const rows = () => {
    const s = sort();
    const rows = [...props.table.rows];
    if (!s) return rows.sort(byDefault);
    return rows.sort((a, b) => {
      const va = sortValue(a, s.key);
      const vb = sortValue(b, s.key);
      if (va === null || vb === null) return va === vb ? byDefault(a, b) : va === null ? 1 : -1;
      return s.dir * compareValues(va, vb) || byDefault(a, b);
    });
  };

  const toggle = (key: SortKey) => {
    const s = sort();
    setSort({ key, dir: s?.key === key && s.dir === 1 ? -1 : 1 });
  };
  const ariaSort = (key: SortKey) => {
    const s = sort();
    return s?.key === key ? (s.dir === 1 ? "ascending" : "descending") : undefined;
  };

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(col) => (
                <th scope="col" aria-sort={ariaSort(col.key)}>
                  <button type="button" onClick={() => toggle(col.key)}>
                    {col.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {ariaSort(col.key) === "ascending" ? " ▲" : ariaSort(col.key) === "descending" ? " ▼" : ""}
                    </span>
                  </button>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr>
                <Show when={isLevelUp()}>
                  <td>{orDash(row.level)}</td>
                </Show>
                <td>
                  <a href={`/moves/${row.name}`}>{row.label}</a>
                </td>
                <td>
                  <TypeBadge type={row.type} />
                </td>
                <td>{orDash(row.category)}</td>
                <td>{orDash(row.power)}</td>
                <td>{orDash(row.accuracy)}</td>
                <td>{orDash(row.pp)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
