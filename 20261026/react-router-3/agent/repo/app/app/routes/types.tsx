import { Link } from "react-router";
import type { Route } from "./+types/types";
import { englishName, getTypes } from "~/lib/data.server";
import { pageTitle } from "~/lib/format";

export async function loader() {
  const types = await getTypes();
  return { types: types.map((t) => ({ name: t.name as string, label: englishName(t) })) };
}

export default function Types({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle("Types")}</title>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((t) => (
          <li key={t.name}>
            <Link to={`/types/${t.name}`} style={{ "--type-color": `var(--type-${t.name})` } as React.CSSProperties}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
