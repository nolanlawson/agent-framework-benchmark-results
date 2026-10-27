import { useId, type ReactNode } from 'react'

export function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section className="panel" id={id} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}
