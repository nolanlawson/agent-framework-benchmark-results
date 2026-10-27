import { createMemo, createSignal, For, Show } from "solid-js";
import { orMissing } from "~/lib/format";
import type { MoveRow, MoveTable } from "~/lib/types";
import { TypeBadge } from "./ui";

type Key = "level" | "label" | "type" | "category" | "power" | "accuracy" | "pp";
type Direction = "ascending" | "descending";

const COLUMNS: { key: Key; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "label", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function sortValue(row: MoveRow, key: Key): string | number | null {
  return key === "type" ? (row.type?.label ?? null) : row[key];
}

function compare(a: string | number | null, b: string | number | null): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function MovesTable(props: { table: MoveTable }) {
  const [sort, setSort] = createSignal<{ key: Key; dir: Direction } | null>(null);
  const columns = () => COLUMNS.filter((c) => c.key !== "level" || props.table.method === "level-up");

  const rows = createMemo(() => {
    const s = sort();
    if (!s) return props.table.rows;
    const sign = s.dir === "ascending" ? 1 : -1;
    return [...props.table.rows].sort((a, b) => {
      const va = sortValue(a, s.key);
      const vb = sortValue(b, s.key);
      // Missing values go last in both directions.
      if (va === null || vb === null) {
        if (va !== vb) return va === null ? 1 : -1;
      } else {
        const c = compare(va, vb);
        if (c) return sign * c;
      }
      return a.label.localeCompare(b.label) || (a.level ?? 0) - (b.level ?? 0);
    });
  });

  const toggle = (key: Key) => {
    const s = sort();
    setSort({ key, dir: s?.key === key && s.dir === "ascending" ? "descending" : "ascending" });
  };

  return (
    <div class="moves-table">
      <div class="table-scroll">
        <table class="data-table">
          <caption>{props.table.label}</caption>
          <thead>
            <tr>
              <For each={columns()}>
                {(col) => {
                  const dir = () => (sort()?.key === col.key ? sort()!.dir : undefined);
                  return (
                    <th scope="col" aria-sort={dir()}>
                      <button type="button" class="sort-button" onClick={() => toggle(col.key)}>
                        {col.label}
                        <span class="sort-indicator" aria-hidden="true">
                          {dir() === "ascending" ? "▲" : dir() === "descending" ? "▼" : ""}
                        </span>
                      </button>
                    </th>
                  );
                }}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => (
                <tr>
                  <Show when={props.table.method === "level-up"}>
                    <td>{orMissing(row.level)}</td>
                  </Show>
                  <td>
                    <a href={`/moves/${row.name}`}>{row.label}</a>
                  </td>
                  <td>{row.type ? <TypeBadge type={row.type} link /> : "—"}</td>
                  <td>{orMissing(row.category)}</td>
                  <td>{orMissing(row.power)}</td>
                  <td>{orMissing(row.accuracy)}</td>
                  <td>{orMissing(row.pp)}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MoveTables(props: { tables: MoveTable[] }) {
  return (
    <For each={props.tables} fallback={<p class="muted">No moves in this game.</p>}>
      {(table) => <MovesTable table={table} />}
    </For>
  );
}
