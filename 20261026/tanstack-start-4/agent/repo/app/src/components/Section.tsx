import type { ReactNode } from 'react'

/** A titled region: a `<section>` labelled by its heading. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const headingId = `${id}-heading`
  return (
    <section id={id} className="panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}
