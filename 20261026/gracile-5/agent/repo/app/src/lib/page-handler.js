// Wraps a route handler so it only loads data when serving requests, never during the
// build (see vite.config.js). Pages read their data from `props`.
export const pageHandler = (load) => (context) => (process.env.POKEDEX_BUILD === '1' ? {} : load(context));
