# Pokédex

An Angular app for browsing Pokémon, moves, abilities and types, backed by the PokeAPI
server in `../api`. See `../SPEC.md` for what it does.

## Scripts

- `npm run build` – production build into `dist/app/browser`.
- `npm start` – serves the build on `$PORT` (default 3000) with `server/server.mjs`. The
  API origin comes from `$API_BASE_URL` (default `http://localhost:9000`) and is written
  into `index.html` at request time, so one build works against any API.
- `npm run dev` – Angular dev server (talks to `http://localhost:9000`).
- `npm test` – unit tests (Vitest). The acceptance tests run from the repo root with `npm test`.

## How it's put together

- `src/app/core/` – the API client (`PokeApi`: fetch with a short-lived in-memory cache),
  response types and formatting helpers.
- `src/app/pages/` – one component per route. Each loads its data with `resource()` from
  the route parameters, which the router binds to component inputs.
- `src/app/shared/` – Pokémon cards, type badges and the loading/not-found state.
- `src/styles.css` – all styling, built on the design tokens in `src/tokens.css`.

All data is fetched from the API in the browser at runtime; nothing is fetched at build time.
