import type { ReactNode } from 'react'

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className="panel">
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}
