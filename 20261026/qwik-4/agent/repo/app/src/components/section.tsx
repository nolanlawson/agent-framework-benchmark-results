import { component$, Slot } from "@builder.io/qwik";

/** A titled panel exposed as a region named by its heading. */
export const Section = component$<{ id: string; title: string; anchor?: string }>(
  ({ id, title, anchor }) => (
    <section class="panel" id={anchor} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      <Slot />
    </section>
  ),
);
