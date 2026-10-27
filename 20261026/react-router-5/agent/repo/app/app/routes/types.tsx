import { Link } from "react-router";
import type { Route } from "./+types/types";
import { pageTitle } from "../lib/format";
import { getTypeOptions } from "../lib/pokeapi.server";

export async function loader() {
  return { types: await getTypeOptions() };
}

export default function TypesPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle("Types")}</title>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((type) => (
          <li key={type.name}>
            <Link
              to={`/types/${type.name}`}
              className="type-tile"
              style={{ "--badge-bg": `var(--type-${type.name})` } as React.CSSProperties}
            >
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
