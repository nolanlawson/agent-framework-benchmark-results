# Pokédex

An Angular 22 app (server-side rendered with `@angular/ssr`) that browses Pokémon, moves,
abilities and types from the PokeAPI server in this repository. See `../SPEC.md`.

## Commands

- `npm run build`: production build into `dist/app`.
- `npm start`: serves the build on `$PORT` (default `3000`), reading API data from
  `$API_BASE_URL` (default `http://localhost:9000`).
- `npm run dev`: development server with live reload.
- `npm test`: unit tests (Vitest). The acceptance tests run from the repository root.

## How it works

- Every page renders on the server at request time (`RenderMode.Server`); nothing is
  prerendered, so the app always shows the API's current data.
- `API_BASE_URL` is read from the environment at runtime and passed to the browser through
  `TransferState`, so one build works against any API server.
- Route resolvers (`src/app/pages/*/…-data.ts`) fetch from the API and build compact view
  models. The server hands those to the browser via `TransferState`, so hydration doesn't
  refetch, and raw API responses (some are hundreds of kilobytes) never reach the page.
- API responses are cached in memory for five minutes (`src/app/core/poke-api.ts`).
- Unknown URLs and names the API doesn't have render "Not found" with HTTP 404. Other API
  failures render "Something went wrong" with HTTP 502.
- Server rendering only answers to `localhost` by default. Behind a reverse proxy, list the
  public host names in the `NG_ALLOWED_HOSTS` environment variable (comma-separated).
