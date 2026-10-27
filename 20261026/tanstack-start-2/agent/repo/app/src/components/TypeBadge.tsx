import { Link } from '@tanstack/react-router'
import type { TypeRef } from '../lib/types'

const style = (name: string) => ({ '--badge-bg': `var(--type-${name}, var(--color-text-muted))` }) as React.CSSProperties

export function TypeBadge({ type }: { type: TypeRef }) {
  return (
    <span className="badge" style={style(type.name)}>
      {type.label}
    </span>
  )
}

export function TypeLink({ type }: { type: TypeRef }) {
  return (
    <Link className="badge" style={style(type.name)} to="/types/$name" params={{ name: type.name }}>
      {type.label}
    </Link>
  )
}
