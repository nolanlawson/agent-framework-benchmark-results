# Pokédex

A SvelteKit 3 (Svelte 5) app backed by the local PokeAPI server. See `../SPEC.md`.

- `npm run build`: production build (adapter-node, output in `build/`)
- `npm start`: serves the build on `$PORT` (default 3000) and reads data from `$API_BASE_URL`
  (default `http://localhost:9000`)

Every page is server-rendered by a `+page.server.ts` load function. API responses are fetched
at request time and cached in memory for 60 seconds (`src/lib/server/api.ts`).
