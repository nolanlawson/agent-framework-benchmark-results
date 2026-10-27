import { component$, Slot } from "@builder.io/qwik";

interface Props {
  id: string;
  title: string;
}

/** A landmark region named by its heading. */
export const Section = component$<Props>(({ id, title }) => (
  <section class="panel" id={id} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{title}</h2>
    <Slot />
  </section>
));
