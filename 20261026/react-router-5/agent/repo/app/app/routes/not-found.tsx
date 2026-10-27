import { notFound } from "../lib/pokeapi.server";

export function loader() {
  throw notFound();
}

export default function NotFoundRoute() {
  return null;
}
