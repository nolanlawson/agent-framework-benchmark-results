import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { orDash } from "~/lib/format";
import { TypeBadge } from "./type-badge";

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type Column = "level" | "label" | "typeLabel" | "category" | "power" | "accuracy" | "pp";

const COLUMNS: { key: Column; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "label", label: "Move" },
  { key: "typeLabel", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

interface Props {
  id: string;
  caption: string;
  rows: MoveRow[];
  showLevel: boolean;
}

export const MovesTable = component$<Props>((props) => {
  const sortKey = useSignal<Column | null>(null);
  const descending = useSignal(false);
  const columns = props.showLevel ? COLUMNS : COLUMNS.slice(1);

  const sorted = useComputed$(() => {
    const rows = [...props.rows];
    const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);
    const key = sortKey.value;
    if (!key) {
      return props.showLevel ? rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || byName(a, b)) : rows.sort(byName);
    }
    const dir = descending.value ? -1 : 1;
    return rows.sort((a, b) => {
      const x = a[key];
      const y = b[key];
      const xMissing = x === null || x === undefined;
      const yMissing = y === null || y === undefined;
      if (xMissing || yMissing) return xMissing === yMissing ? byName(a, b) : xMissing ? 1 : -1;
      const diff = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return diff * dir || byName(a, b);
    });
  });

  return (
    <div class="table-scroll">
      <table class="moves-table" id={props.id}>
        <caption>{props.caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sortKey.value === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (descending.value ? "descending" : "ascending") : undefined}
                >
                  <button
                    type="button"
                    class="sort-button"
                    onClick$={() => {
                      if (sortKey.value === col.key) descending.value = !descending.value;
                      else {
                        sortKey.value = col.key;
                        descending.value = false;
                      }
                    }}
                  >
                    {col.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {active ? (descending.value ? "▼" : "▲") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.value.map((row) => (
            <tr key={`${row.name}-${row.level}`}>
              {props.showLevel && <td>{orDash(row.level)}</td>}
              <td>
                <Link href={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>
                <TypeBadge name={row.type} label={row.typeLabel} link />
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
});
