/** Update the URL without re-rendering (the page updates itself). */
export function updateUrl(url: URL, replace = true) {
  if (url.href === location.href) return;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}
