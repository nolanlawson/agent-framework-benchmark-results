"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TypeBadge } from "./TypeBadge";

export type MoveRow = {
  key: string;
  level?: number;
  name: string;
  label: string;
  type: { name: string; label: string };
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

const COLUMNS: { key: Column; label: string; numeric?: boolean }[] = [
  { key: "level", label: "Level", numeric: true },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power", numeric: true },
  { key: "accuracy", label: "Accuracy", numeric: true },
  { key: "pp", label: "PP", numeric: true },
];

const MISSING = "—";

function sortValue(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case "level":
      return row.level ?? null;
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

type Sort = { column: Column; direction: "ascending" | "descending" } | null;

export function MoveTable({ caption, rows, showLevel }: { caption: string; rows: MoveRow[]; showLevel: boolean }) {
  const [sort, setSort] = useState<Sort>(null);
  const columns = showLevel ? COLUMNS : COLUMNS.filter((c) => c.key !== "level");

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.column);
      const y = sortValue(b, sort.column);
      // Missing values go last in both directions.
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return order * factor;
    });
  }, [rows, sort]);

  function toggle(column: Column) {
    setSort((current) =>
      current?.column === column
        ? { column, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { column, direction: "ascending" },
    );
  }

  return (
    <div className="table-scroll">
      <table className="move-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort?.column === c.key ? sort.direction : undefined}
                className={c.key === "move" ? "move-table__move" : undefined}
              >
                <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                  {c.label}
                  <span className="sort-button__icon" aria-hidden="true">
                    {sort?.column === c.key ? (sort.direction === "ascending" ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              {showLevel && <td>{row.level ?? MISSING}</td>}
              <td>
                <Link href={`/moves/${row.name}`} prefetch={false}>
                  {row.label}
                </Link>
              </td>
              <td>
                <TypeBadge type={row.type} />
              </td>
              <td>{row.category ?? MISSING}</td>
              <td>{row.power ?? MISSING}</td>
              <td>{row.accuracy ?? MISSING}</td>
              <td>{row.pp ?? MISSING}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
