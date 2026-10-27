import { Link } from "react-router";
import type { Route } from "./+types/types";
import { englishName, getMainTypes } from "~/lib/api.server";
import { pageTitle } from "~/lib/format";

export const meta: Route.MetaFunction = () => [{ title: pageTitle("Types") }];

export async function loader() {
  const types = await getMainTypes();
  return { types: types.map((t) => ({ name: t.name, label: englishName(t) })) };
}

export default function Types({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1 className="page-title">Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((t) => (
          <li key={t.name}>
            <Link
              to={`/types/${t.name}`}
              className="type-tile"
              style={{ "--type-color": `var(--type-${t.name})` } as React.CSSProperties}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
