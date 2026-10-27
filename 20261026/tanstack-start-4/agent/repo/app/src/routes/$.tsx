import { createFileRoute, notFound } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { pageTitle } from '../lib/format'

// Any URL no other route matches.
export const Route = createFileRoute('/$')({
  loader: () => {
    throw notFound()
  },
  head: () => ({ meta: [{ title: pageTitle('Not found') }] }),
  notFoundComponent: NotFound,
})
