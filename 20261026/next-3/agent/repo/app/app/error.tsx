"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <title>Something went wrong – Pokédex</title>
      <h1 className="page-title">Something went wrong</h1>
      <p>
        The Pokédex couldn’t load this page. <button type="button" onClick={reset} className="link-button">Try again</button> or go{" "}
        <Link href="/">back to the Pokédex</Link>.
      </p>
    </>
  );
}
