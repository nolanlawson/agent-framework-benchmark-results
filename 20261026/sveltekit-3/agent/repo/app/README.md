# Pokédex

A SvelteKit 3 app (adapter-node) that browses Pokémon, moves, abilities and types from a
PokeAPI-compatible server.

```sh
npm install
npm run build
API_BASE_URL=http://localhost:9000 PORT=3000 npm start
```

- All data is fetched from `API_BASE_URL` at request time, in server `load` functions.
  `src/lib/server/api.ts` caches trimmed responses in memory (fresh for a minute, then
  stale-while-revalidate for up to ten).
- Home page filters (`q`, `type`, `generation`, `page`) live in the URL and are applied on
  the server, so every view is linkable and works without JavaScript.
- Styles use the design tokens in `src/lib/styles/tokens.css`.
