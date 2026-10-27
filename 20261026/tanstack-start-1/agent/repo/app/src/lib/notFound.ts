import { pageTitle } from './format'

export const NOT_FOUND_TITLE = pageTitle('Not found')

export function titleHead(title: string | undefined) {
  return { meta: [{ title: title ?? NOT_FOUND_TITLE }] }
}
