import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { MoveRow, MoveTableData } from "~/lib/types";
import { orDash } from "~/lib/format";
import { TypeBadge } from "./type-badge";

type Column = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";
type Direction = "ascending" | "descending";

const COLUMNS: { key: Column; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function sortValue(row: MoveRow, column: Column): number | string | null {
  switch (column) {
    case "move":
      return row.label;
    case "type":
      return row.type?.label ?? null;
    case "category":
      return row.category;
    default:
      return row[column];
  }
}

function compareValues(a: number | string, b: number | string): number {
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b));
}

const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

/** Rows in the requested order; missing values always go last. */
function sortRows(rows: MoveRow[], column: Column | null, direction: Direction, isLevelUp: boolean) {
  const sorted = [...rows];
  if (!column) {
    return sorted.sort((a, b) =>
      isLevelUp ? (a.level ?? Infinity) - (b.level ?? Infinity) || byName(a, b) : byName(a, b),
    );
  }
  const sign = direction === "ascending" ? 1 : -1;
  return sorted.sort((a, b) => {
    const va = sortValue(a, column);
    const vb = sortValue(b, column);
    if (va === null || vb === null) {
      if (va === vb) return byName(a, b);
      return va === null ? 1 : -1;
    }
    return sign * compareValues(va, vb) || byName(a, b);
  });
}

export const MovesTable = component$<{ table: MoveTableData }>(({ table }) => {
  const sortColumn = useSignal<Column | null>(null);
  const sortDirection = useSignal<Direction>("ascending");

  const isLevelUp = table.method === "level-up";
  const columns = COLUMNS.filter((c) => isLevelUp || c.key !== "level");
  const rows = sortRows(table.rows, sortColumn.value, sortDirection.value, isLevelUp);

  return (
    <div class="table-scroll">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sortColumn.value === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={sorted ? sortDirection.value : undefined}>
                  <button
                    type="button"
                    class="sort-button"
                    onClick$={() => {
                      if (sortColumn.value === c.key) {
                        sortDirection.value =
                          sortDirection.value === "ascending" ? "descending" : "ascending";
                      } else {
                        sortColumn.value = c.key;
                        sortDirection.value = "ascending";
                      }
                    }}
                  >
                    {c.label}
                    {sorted && (
                      <span class="sort-indicator" aria-hidden="true">
                        {sortDirection.value === "ascending" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.name}-${row.level ?? ""}-${i}`}>
              {isLevelUp && <td>{orDash(row.level)}</td>}
              <td>
                <Link href={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>{row.type ? <TypeBadge type={row.type} link /> : "—"}</td>
              <td>{orDash(row.category)}</td>
              <td>{orDash(row.power)}</td>
              <td>{orDash(row.accuracy)}</td>
              <td>{orDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
