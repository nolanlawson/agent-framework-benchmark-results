import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { orDash, type TypeRef } from "~/lib/format";
import { TypeBadge } from "./type-badge";

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

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

function sortValue(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case "level":
      return row.level;
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

const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

function sortRows(rows: MoveRow[], column: Column | null, direction: Direction): MoveRow[] {
  const sorted = rows.slice();
  if (!column) {
    // Default order: by level (when there is one), then by move name.
    return sorted.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || byName(a, b));
  }
  const sign = direction === "ascending" ? 1 : -1;
  return sorted.sort((a, b) => {
    const va = sortValue(a, column);
    const vb = sortValue(b, column);
    // Missing values sort last in both directions.
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp =
      typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || byName(a, b);
  });
}

export const MovesTable = component$<{ caption: string; showLevel: boolean; rows: MoveRow[] }>(
  ({ caption, showLevel, rows }) => {
    const column = useSignal<Column | null>(null);
    const direction = useSignal<Direction>("ascending");
    const columns = showLevel ? COLUMNS : COLUMNS.filter((c) => c.key !== "level");
    const sorted = sortRows(rows, column.value, direction.value);

    return (
      <div class="table-scroll">
        <table class="moves">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={column.value === c.key ? direction.value : undefined}
                >
                  <button
                    type="button"
                    class="sort-button"
                    onClick$={() => {
                      if (column.value === c.key) {
                        direction.value = direction.value === "ascending" ? "descending" : "ascending";
                      } else {
                        column.value = c.key;
                        direction.value = "ascending";
                      }
                    }}
                  >
                    {c.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {column.value === c.key ? (direction.value === "ascending" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.name}-${row.level ?? ""}`}>
                {showLevel && <td>{orDash(row.level)}</td>}
                <td>
                  <Link href={`/moves/${row.name}`}>{row.label}</Link>
                </td>
                <td>{row.type ? <TypeBadge type={row.type} /> : "—"}</td>
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
  },
);
