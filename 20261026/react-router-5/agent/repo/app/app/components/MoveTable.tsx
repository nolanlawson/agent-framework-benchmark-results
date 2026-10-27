import { useState } from "react";
import { Link } from "react-router";
import { orMissing } from "../lib/format";
import type { MoveRow, MoveTable as MoveTableData } from "../lib/pokeapi.server";
import { TypeLink } from "./TypeBadge";

type Column = { key: string; label: string; value: (row: MoveRow) => string | number | null };

const LEVEL: Column = { key: "level", label: "Level", value: (r) => r.level };
const COLUMNS: Column[] = [
  { key: "move", label: "Move", value: (r) => r.label },
  { key: "type", label: "Type", value: (r) => r.type.label },
  { key: "category", label: "Category", value: (r) => r.category },
  { key: "power", label: "Power", value: (r) => r.power },
  { key: "accuracy", label: "Accuracy", value: (r) => r.accuracy },
  { key: "pp", label: "PP", value: (r) => r.pp },
];

type Sort = { key: string; direction: "ascending" | "descending" } | null;

function compareValues(a: string | number | null, b: string | number | null) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function sortRows(rows: MoveRow[], columns: Column[], sort: Sort, isLevelUp: boolean) {
  const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);
  if (!sort) {
    return [...rows].sort((a, b) => (isLevelUp ? (a.level ?? 0) - (b.level ?? 0) : 0) || byName(a, b));
  }
  const column = columns.find((c) => c.key === sort.key)!;
  const sign = sort.direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = column.value(a);
    const vb = column.value(b);
    // Missing values go last whichever way the table is sorted.
    if (va === null || vb === null) return va === vb ? byName(a, b) : va === null ? 1 : -1;
    return sign * compareValues(va, vb) || byName(a, b);
  });
}

export function MoveTable({ table }: { table: MoveTableData }) {
  const isLevelUp = table.method === "level-up";
  const columns = isLevelUp ? [LEVEL, ...COLUMNS] : COLUMNS;
  const [sort, setSort] = useState<Sort>(null);
  const rows = sortRows(table.rows, columns, sort, isLevelUp);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: "ascending" },
    );

  return (
    <div className="table-scroll">
      <table className="move-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const direction = sort?.key === column.key ? sort.direction : undefined;
              return (
                <th key={column.key} scope="col" aria-sort={direction} className={`col-${column.key}`}>
                  <button type="button" className="sort-button" onClick={() => toggle(column.key)}>
                    {column.label}
                    <span className="sort-indicator" aria-hidden="true">
                      {direction === "ascending" ? "▲" : direction === "descending" ? "▼" : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.level}-${row.name}`}>
              {isLevelUp && <td>{orMissing(row.level)}</td>}
              <td>
                <Link to={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>
                <TypeLink type={row.type} />
              </td>
              <td>{orMissing(row.category)}</td>
              <td>{orMissing(row.power)}</td>
              <td>{orMissing(row.accuracy)}</td>
              <td>{orMissing(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
