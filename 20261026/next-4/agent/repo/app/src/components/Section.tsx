import type { ReactNode } from 'react';

/** A titled region: a <section> named by its <h2>. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="panel" id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}
