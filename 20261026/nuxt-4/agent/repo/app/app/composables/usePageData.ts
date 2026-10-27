import type { Ref } from 'vue';

/** Fetches a page's data from the app's server routes; a missing resource becomes the Not found page. */
export async function usePageData<T>(url: string): Promise<Ref<T>> {
  const { data, error } = await useFetch<T>(url, { key: url, dedupe: 'defer' });
  if (error.value || !data.value) {
    const statusCode = error.value?.statusCode ?? 404;
    throw createError({ statusCode, statusMessage: statusCode === 404 ? 'Not found' : 'Error', fatal: true });
  }
  return data as Ref<T>;
}
