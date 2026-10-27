import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { TypeBadge } from "./ui";
import { orDash } from "~/lib/format";
import type { MoveRow, MoveTable } from "~/lib/pokemon";

type Column = { key: keyof MoveRow | "type"; label: string };

const sortValue = (row: MoveRow, key: Column["key"]) => {
  if (key === "type") return row.type?.label ?? null;
  if (key === "name") return row.label;
  return row[key] as string | number | null;
};

export const MovesTable = component$<{ table: MoveTable }>(({ table }) => {
  const sort = useSignal<{ key: Column["key"]; dir: "ascending" | "descending" } | null>(null);
  const columns: Column[] = [
    ...(table.method === "level-up" ? [{ key: "level", label: "Level" } as Column] : []),
    { key: "name", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  const rows = useComputed$(() => {
    const s = sort.value;
    if (!s) return table.rows;
    const factor = s.dir === "ascending" ? 1 : -1;
    return [...table.rows].sort((a, b) => {
      const va = sortValue(a, s.key);
      const vb = sortValue(b, s.key);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * factor;
    });
  });

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort.value?.key === col.key;
              return (
                <th key={col.key} scope="col" aria-sort={active ? sort.value!.dir : undefined}>
                  <button
                    type="button"
                    class="sort-button"
                    onClick$={() => {
                      sort.value =
                        sort.value?.key === col.key
                          ? {
                              key: col.key,
                              dir: sort.value.dir === "ascending" ? "descending" : "ascending",
                            }
                          : { key: col.key, dir: "ascending" };
                    }}
                  >
                    {col.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {active ? (sort.value!.dir === "ascending" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.value.map((row) => (
            <tr key={row.key}>
              {table.method === "level-up" && <td>{orDash(row.level)}</td>}
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
