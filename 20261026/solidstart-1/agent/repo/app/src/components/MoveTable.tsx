import { createMemo, createSignal, For, Show } from "solid-js";
import { display } from "~/lib/format";
import type { MoveRow, MoveTable as Table } from "~/lib/types";
import { TypeBadge } from "./TypeBadge";

type Column = { key: string; label: string; value: (row: MoveRow) => string | number | null; numeric?: boolean };

const COLUMNS: Column[] = [
  { key: "level", label: "Level", value: (r) => r.level, numeric: true },
  { key: "move", label: "Move", value: (r) => r.label },
  { key: "type", label: "Type", value: (r) => r.type?.label ?? null },
  { key: "category", label: "Category", value: (r) => r.category },
  { key: "power", label: "Power", value: (r) => r.power, numeric: true },
  { key: "accuracy", label: "Accuracy", value: (r) => r.accuracy, numeric: true },
  { key: "pp", label: "PP", value: (r) => r.pp, numeric: true },
];

type Sort = { key: string; dir: "ascending" | "descending" };

export function MoveTable(props: { table: Table }) {
  const columns = () => COLUMNS.filter((c) => c.key !== "level" || props.table.method === "level-up");
  const [sort, setSort] = createSignal<Sort | null>(null);

  const rows = createMemo(() => {
    const current = sort();
    if (!current) return props.table.rows;
    const column = COLUMNS.find((c) => c.key === current.key)!;
    const sign = current.dir === "ascending" ? 1 : -1;
    return [...props.table.rows].sort((a, b) => {
      const va = column.value(a);
      const vb = column.value(b);
      // Missing values go last whichever way the column is sorted.
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      const diff = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sign * diff || a.label.localeCompare(b.label);
    });
  });

  const toggle = (key: string) => {
    const current = sort();
    setSort({ key, dir: current?.key === key && current.dir === "ascending" ? "descending" : "ascending" });
  };

  return (
    <div class="table-scroll">
      <table class="moves-table">
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(column) => (
                <th scope="col" aria-sort={sort()?.key === column.key ? sort()!.dir : undefined}>
                  <button type="button" class="sort-button" onClick={() => toggle(column.key)}>
                    {column.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {sort()?.key === column.key ? (sort()!.dir === "ascending" ? " ▲" : " ▼") : ""}
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
                <Show when={props.table.method === "level-up"}>
                  <td>{display(row.level)}</td>
                </Show>
                <td>
                  <a href={`/moves/${row.name}`}>{row.label}</a>
                </td>
                <td>{row.type ? <TypeBadge type={row.type} /> : display(null)}</td>
                <td>{display(row.category)}</td>
                <td>{display(row.power)}</td>
                <td>{display(row.accuracy)}</td>
                <td>{display(row.pp)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
