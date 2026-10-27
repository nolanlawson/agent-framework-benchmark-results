import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { TypeInfo } from "~/lib/api.server";
import { orDash } from "~/lib/format";
import { TypeBadge } from "./ui";

export type MoveRow = {
  key: string;
  level: number | null;
  name: string;
  label: string;
  type: TypeInfo | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";
type Direction = "ascending" | "descending";

const COLUMNS: { id: Column; label: string }[] = [
  { id: "level", label: "Level" },
  { id: "move", label: "Move" },
  { id: "type", label: "Type" },
  { id: "category", label: "Category" },
  { id: "power", label: "Power" },
  { id: "accuracy", label: "Accuracy" },
  { id: "pp", label: "PP" },
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

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function MovesTable({ label, levels, rows }: { label: string; levels: boolean; rows: MoveRow[] }) {
  const [sort, setSort] = useState<{ column: Column; direction: Direction } | null>(null);
  const columns = levels ? COLUMNS : COLUMNS.filter((c) => c.id !== "level");

  const sorted = useMemo(() => {
    const byDefault = (a: MoveRow, b: MoveRow) =>
      (levels ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label);
    const result = [...rows].sort(byDefault);
    if (!sort) return result;
    const flip = sort.direction === "ascending" ? 1 : -1;
    return result.sort((a, b) => {
      const va = sortValue(a, sort.column);
      const vb = sortValue(b, sort.column);
      // Missing values go last in both directions.
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      return flip * compareValues(va, vb);
    });
  }, [rows, sort, levels]);

  function toggle(column: Column) {
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { column, direction: "ascending" },
    );
  }

  return (
    <div className="moves-table">
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" aria-sort={sort?.column === column.id ? sort.direction : undefined}>
                <button type="button" onClick={() => toggle(column.id)}>
                  {column.label}
                  <span className="sort-indicator" aria-hidden="true">
                    {sort?.column === column.id ? (sort.direction === "ascending" ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              {levels && <td>{orDash(row.level)}</td>}
              <td>
                <Link to={`/moves/${row.name}`}>{row.label}</Link>
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
}
