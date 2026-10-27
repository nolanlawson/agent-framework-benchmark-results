/** Path and query of the view currently on screen (the hash is ignored). */
let shown = '';

export const locationKey = (url: { pathname: string; search: string } = location): string => url.pathname + url.search;

export function markShown(key: string): void {
  shown = key;
}

export const isShown = (key: string): boolean => key === shown;

/** Updates the URL for state a page has already applied (filters, selected game). */
export function updateUrl(href: string, replace: boolean): void {
  if (replace) history.replaceState(history.state, '', href);
  else history.pushState(null, '', href);
  markShown(locationKey());
}
