/**
 * In server mode, `vite build` renders every route once with a stub URL on the
 * `gracile-static` origin, only to collect each page's scripts and styles. Handlers
 * use this to skip loading data then: API data must only be fetched at request time.
 */
export const isBuildRender = (url: URL) => url.hostname === 'gracile-static';
