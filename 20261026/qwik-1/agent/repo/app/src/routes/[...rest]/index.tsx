import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/ui";
import { pageTitle } from "~/lib/format";

export const useNotFound = routeLoader$(({ status }) => {
  status(404);
  return true;
});

export default component$(() => {
  useNotFound();
  return <NotFound />;
});

export const head: DocumentHead = { title: pageTitle("Not found") };
