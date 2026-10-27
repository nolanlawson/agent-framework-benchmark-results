import { Link } from '@tanstack/react-router'
import type { TypeRef } from '../lib/types'

export function TypeBadge({ type, link = true }: { type: TypeRef; link?: boolean }) {
  const style = { '--badge-bg': `var(--type-${type.name}, var(--color-text-muted))` } as React.CSSProperties
  if (!link) {
    return (
      <span className="type-badge" style={style}>
        {type.label}
      </span>
    )
  }
  return (
    <Link to="/types/$name" params={{ name: type.name }} className="type-badge" style={style}>
      {type.label}
    </Link>
  )
}

export function TypeList({ types, link = true }: { types: TypeRef[]; link?: boolean }) {
  return (
    <span className="type-list">
      {types.map((t) => (
        <TypeBadge key={t.name} type={t} link={link} />
      ))}
    </span>
  )
}
