# Pokédex (Qwik City)

A Pokédex built with Qwik 1.20 / Qwik City and the Node server adapter. All data comes
from the PokeAPI server at `API_BASE_URL` at request time (server-side route loaders, with
a short-lived in-memory cache in `src/lib/api.ts`).

- `npm run build` – client and server production build
- `npm start` – serve the build on `$PORT` (default 3000)
- `npm run dev` – dev server
