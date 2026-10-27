import { notFound } from "~/lib/api.server";

export function loader() {
  throw notFound();
}

export default function NotFound() {
  return null;
}
