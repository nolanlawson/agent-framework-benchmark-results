import { createFileRoute, notFound } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { titleHead } from '../lib/notFound'

export const Route = createFileRoute('/$')({
  loader: () => {
    throw notFound()
  },
  head: () => titleHead(undefined),
  component: NotFound,
  notFoundComponent: NotFound,
})
