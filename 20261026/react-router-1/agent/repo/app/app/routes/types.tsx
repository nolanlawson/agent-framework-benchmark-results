import { Link } from "react-router";
import type { Route } from "./+types/types";
import { getTypes } from "~/lib/api.server";
import { pageTitle } from "~/lib/format";

export async function loader() {
  const types = await getTypes();
  return { types: types.map(({ name, label }) => ({ name, label })) };
}

export default function Types({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle("Types")}</title>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((type) => (
          <li key={type.name}>
            <Link to={`/types/${type.name}`} className={`type-tile type-${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
