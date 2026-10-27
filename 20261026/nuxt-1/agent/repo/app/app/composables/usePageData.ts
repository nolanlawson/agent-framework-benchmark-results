/**
 * Fetches a page's data from our server API. A 404 from the API (an unknown Pokémon, move,
 * ability or type) becomes the app's Not found page.
 */
export async function usePageData<T>(url: string) {
  const { data, error } = await useFetch<T>(url)
  if (error.value || !data.value) {
    const statusCode = error.value?.statusCode ?? 404
    throw createError({ statusCode, statusMessage: statusCode === 404 ? 'Not found' : 'Error', fatal: true })
  }
  return data as Ref<T>
}
