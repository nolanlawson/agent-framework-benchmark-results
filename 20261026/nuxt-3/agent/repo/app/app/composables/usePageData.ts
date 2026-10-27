import type { UseFetchOptions } from '#app'

/** Document title: `<heading> – Pokédex`, or just `Pokédex` without a heading. */
export function pageTitle(title?: string | null): string {
  return title ? `${title} – Pokédex` : 'Pokédex'
}

/** First value of a route query parameter, or `''`. */
export function queryParam(value: unknown): string {
  if (Array.isArray(value)) return queryParam(value[0])
  return typeof value === 'string' ? value : ''
}

/**
 * Fetch data for a page from the app's server API. If that fails (for example because the
 * Pokémon doesn't exist), the error page is shown instead.
 */
export async function usePageData<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  const result = await useFetch<T>(url, options as any)
  if (result.error.value) throw pageError(result.error.value.statusCode)
  watch(result.error, (error) => error && showError(pageError(error.statusCode)))
  return result
}

function pageError(statusCode = 500) {
  return createError({ statusCode, statusMessage: statusCode === 404 ? 'Not found' : 'Server error', fatal: true })
}

/** False until the component has hydrated, so controls that need JavaScript can wait for it. */
export function useHydrated() {
  const hydrated = ref(false)
  onMounted(() => (hydrated.value = true))
  return hydrated
}
