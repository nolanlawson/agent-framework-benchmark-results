import { Link } from '@tanstack/react-router'

export function ErrorPage() {
  return (
    <>
      <h1>Something went wrong</h1>
      <p>The Pokédex couldn’t load this page. Please try again in a moment.</p>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
