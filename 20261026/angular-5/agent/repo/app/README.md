# Pokédex

An Angular app (server-side rendered with `@angular/ssr`) that browses Pokémon, moves,
abilities and types from a PokeAPI-compatible server.

```sh
npm install
npm run build
API_BASE_URL=http://localhost:9000 PORT=3000 npm start
```

- `src/server/pokeapi.ts` fetches from the API at request time (with a 60 s in-memory
  cache) and builds the compact view models each page needs.
- Server rendering calls it directly and hands the result to the browser through
  `TransferState`; client-side navigations fetch the same view models from `/data/...`.
- `NG_ALLOWED_HOSTS` (comma-separated) restricts the hosts the server accepts; by default
  any host is accepted, on the assumption that a reverse proxy validates them.
