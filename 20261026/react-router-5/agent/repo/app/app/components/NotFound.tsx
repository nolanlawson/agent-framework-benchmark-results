import { Link } from "react-router";
import { pageTitle } from "../lib/format";

export function NotFound() {
  return (
    <>
      <title>{pageTitle("Not found")}</title>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
