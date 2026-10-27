/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export const MISSING = '—'
