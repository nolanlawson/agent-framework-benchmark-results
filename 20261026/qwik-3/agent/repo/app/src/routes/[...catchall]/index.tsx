import { component$ } from "@builder.io/qwik";
import type { DocumentHead, RequestHandler } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { title } from "~/lib/format";

export const onRequest: RequestHandler = ({ status }) => {
  status(404);
};

export default component$(() => <NotFound />);

export const head: DocumentHead = { title: title("Not found") };
