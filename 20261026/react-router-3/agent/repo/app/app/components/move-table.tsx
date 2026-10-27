import { useMemo, useState } from "react";
import { Link } from "react-router";
import { orDash } from "~/lib/format";
import { TypeBadge, type TypeRef } from "./ui";

export type MoveRow = {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";
type Sort = { column: Column; direction: "ascending" | "descending" } | null;

const COLUMNS: { key: Column; label: string; numeric?: boolean }[] = [
  { key: "level", label: "Level", numeric: true },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power", numeric: true },
  { key: "accuracy", label: "Accuracy", numeric: true },
  { key: "pp", label: "PP", numeric: true },
];

function valueOf(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case "level":
      return row.level;
    case "move":
      return row.label;
    case "type":
      return row.type.label;
    case "category":
      return row.category;
    default:
      return row[column];
  }
}

const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

function compare(a: MoveRow, b: MoveRow, column: Column, descending: boolean) {
  const x = valueOf(a, column);
  const y = valueOf(b, column);
  // Missing values sort last in both directions.
  if (x === null || y === null) return x === y ? byName(a, b) : x === null ? 1 : -1;
  const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
  return (descending ? -result : result) || byName(a, b);
}

export function MoveTable({ caption, levels, rows }: { caption: string; levels: boolean; rows: MoveRow[] }) {
  const [sort, setSort] = useState<Sort>(null);
  const columns = levels ? COLUMNS : COLUMNS.slice(1);

  const sorted = useMemo(() => {
    if (sort) return [...rows].sort((a, b) => compare(a, b, sort.column, sort.direction === "descending"));
    return [...rows].sort(levels ? (a, b) => compare(a, b, "level", false) : byName);
  }, [rows, sort, levels]);

  const toggle = (column: Column) =>
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { column, direction: "ascending" },
    );

  return (
    <div className="table-scroll">
      <table className="moves">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.column === c.key ? sort.direction : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={active} className={c.numeric ? "numeric" : undefined}>
                  <button type="button" onClick={() => toggle(c.key)}>
                    {c.label}
                    {active && <span aria-hidden="true">{active === "ascending" ? " ▲" : " ▼"}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={`${row.name} ${row.level}`}>
              {levels && <td>{orDash(row.level)}</td>}
              <td>
                <Link to={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>
                <TypeBadge type={row.type} />
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
  );
}
