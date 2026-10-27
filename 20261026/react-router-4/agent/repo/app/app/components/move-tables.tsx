import { useState } from "react";
import { Link } from "react-router";
import { orDash } from "~/lib/format";
import { TypeBadge } from "./ui";

export type MoveRow = {
  name: string;
  label: string;
  level: number | null;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Table = { method: string; label: string; rows: MoveRow[] };
type ColumnKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";
type Sort = { column: ColumnKey; direction: "ascending" | "descending" } | null;

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function sortValue(row: MoveRow, column: ColumnKey): string | number | null {
  switch (column) {
    case "level":
      return row.level;
    case "move":
      return row.label;
    case "type":
      return row.typeLabel;
    case "category":
      return row.category;
    default:
      return row[column];
  }
}

function compareValues(a: string | number, b: string | number) {
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
}

function sortRows(rows: MoveRow[], sort: Sort, isLevelUp: boolean): MoveRow[] {
  const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);
  if (!sort) {
    return [...rows].sort((a, b) => (isLevelUp ? (a.level ?? 0) - (b.level ?? 0) : 0) || byName(a, b));
  }
  const sign = sort.direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, sort.column);
    const vb = sortValue(b, sort.column);
    // Missing values go last in both directions.
    if (va === null || vb === null) return va === vb ? byName(a, b) : va === null ? 1 : -1;
    return sign * compareValues(va, vb) || byName(a, b);
  });
}

function MoveTable({ table }: { table: Table }) {
  const isLevelUp = table.method === "level-up";
  const columns = isLevelUp ? COLUMNS : COLUMNS.filter((c) => c.key !== "level");
  const [sort, setSort] = useState<Sort>(null);
  const rows = sortRows(table.rows, sort, isLevelUp);

  function toggle(column: ColumnKey) {
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { column, direction: "ascending" },
    );
  }

  return (
    <div className="move-table">
      <div className="table-scroll">
        <table>
          <caption>{table.label}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.column === c.key ? sort.direction : undefined}>
                  <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                    {c.label}
                    <span aria-hidden="true" className="sort-indicator">
                      {sort?.column === c.key ? (sort.direction === "ascending" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.level ?? ""}`}>
                {isLevelUp && <td>{orDash(row.level)}</td>}
                <td>
                  <Link to={`/moves/${row.name}`}>{row.label}</Link>
                </td>
                <td>
                  <TypeBadge name={row.type} label={row.typeLabel} />
                </td>
                <td>{orDash(row.category)}</td>
                <td>{orDash(row.power)}</td>
                <td>{orDash(row.accuracy)}</td>
                <td>{orDash(row.pp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MoveTables({ tables }: { tables: Table[] }) {
  if (tables.length === 0) return <p>No moves are learned in this game.</p>;
  return (
    <>
      {tables.map((t) => (
        <MoveTable key={t.method} table={t} />
      ))}
    </>
  );
}
