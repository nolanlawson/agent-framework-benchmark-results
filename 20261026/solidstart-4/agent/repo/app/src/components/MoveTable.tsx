import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";
import { orMissing } from "~/lib/format";
import type { MoveRow, MoveTable as MoveTableData } from "~/lib/types";
import TypeBadge from "./TypeBadge";

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

const sortValue = (row: MoveRow, key: Key): string | number | null =>
  key === "type" ? (row.type?.label ?? null) : row[key];

function compareRows(a: MoveRow, b: MoveRow, key: Key, direction: Direction) {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  // Missing values go last whichever way the column is sorted.
  if (va === null || vb === null) {
    if (va === vb) return a.label.localeCompare(b.label);
    return va === null ? 1 : -1;
  }
  const order = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
  return (direction === "ascending" ? order : -order) || a.label.localeCompare(b.label);
}

export default function MoveTable(props: { table: MoveTableData }) {
  const [sort, setSort] = createSignal<{ key: Key; direction: Direction } | null>(null);
  const columns = () => COLUMNS.filter((c) => c.key !== "level" || props.table.method === "level-up");
  const rows = createMemo(() => {
    const current = sort();
    if (!current) return props.table.rows;
    return [...props.table.rows].sort((a, b) => compareRows(a, b, current.key, current.direction));
  });

  const toggle = (key: Key) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: "ascending" },
    );

  return (
    <div class="table-scroll">
      <table class="move-table">
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(column) => (
                <th scope="col" aria-sort={sort()?.key === column.key ? sort()!.direction : undefined}>
                  <button type="button" class="sort-button" onClick={() => toggle(column.key)}>
                    {column.label}
                    <Show when={sort()?.key === column.key}>
                      <span class="sort-indicator" aria-hidden="true">
                        {sort()!.direction === "ascending" ? "▲" : "▼"}
                      </span>
                    </Show>
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
                <Show when={props.table.method === "level-up"}>
                  <td>{orMissing(row.level)}</td>
                </Show>
                <td>
                  <A href={`/moves/${row.name}`}>{row.label}</A>
                </td>
                <td>{row.type ? <TypeBadge type={row.type} /> : orMissing(null)}</td>
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
  );
}
