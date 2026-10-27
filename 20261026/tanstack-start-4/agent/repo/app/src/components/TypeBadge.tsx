import { Link } from '@tanstack/react-router'
import type { TypeRef } from '../lib/types'

const style = (name: string) => ({ backgroundColor: `var(--type-${name}, var(--color-text-muted))` })

/** A type pill; a link to the type page unless `plain`. */
export function TypeBadge({ type, plain = false }: { type: TypeRef; plain?: boolean }) {
  if (plain) {
    return (
      <span className="type-badge" style={style(type.name)}>
        {type.label}
      </span>
    )
  }
  return (
    <Link to="/types/$name" params={{ name: type.name }} className="type-badge" style={style(type.name)}>
      {type.label}
    </Link>
  )
}

export function TypeBadges({ types, plain = false }: { types: TypeRef[]; plain?: boolean }) {
  return (
    <span className="type-badges">
      {types.map((t) => (
        <TypeBadge key={t.name} type={t} plain={plain} />
      ))}
    </span>
  )
}
