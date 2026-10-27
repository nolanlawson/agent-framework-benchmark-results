import type { JSX } from "solid-js";

export function Section(props: { id: string; title: string; children: JSX.Element; class?: string }) {
  return (
    <section class={`panel ${props.class ?? ""}`} id={props.id} aria-labelledby={`${props.id}-heading`}>
      <h2 class="panel__title" id={`${props.id}-heading`}>
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}
