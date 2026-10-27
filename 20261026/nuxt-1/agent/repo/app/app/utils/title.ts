/** `<h1> – Pokédex`; the home page passes no title and gets just `Pokédex`. */
export function siteTitle(title?: string | null): string {
  return title ? `${title} – Pokédex` : 'Pokédex'
}

/** First value of a route query parameter, as a string. */
export function queryString(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : ''
}
