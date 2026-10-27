import { component$, Slot } from "@builder.io/qwik";

/** A titled region: a <section> named by its <h2>. */
export const Section = component$<{ id: string; title: string }>(({ id, title }) => (
  <section class="panel" id={id} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{title}</h2>
    <Slot />
  </section>
));
