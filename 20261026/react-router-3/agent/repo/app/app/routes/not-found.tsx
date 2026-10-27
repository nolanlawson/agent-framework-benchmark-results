import { notFound } from "~/lib/data.server";

export function loader() {
  notFound();
}

export default function NotFound() {
  return null;
}
