import type { JSX } from "solid-js";

/** A titled region: its accessible name is its heading. */
export default function Section(props: { id: string; title: string; class?: string; children: JSX.Element }) {
  return (
    <section id={props.id} class={`panel ${props.class ?? ""}`} aria-labelledby={`${props.id}-heading`}>
      <h2 id={`${props.id}-heading`}>{props.title}</h2>
      {props.children}
    </section>
  );
}
