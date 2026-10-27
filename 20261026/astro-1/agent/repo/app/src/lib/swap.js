// Fetches a server-rendered page and replaces parts of the current one with its version,
// so the server stays the single place where pages are rendered.
let latest = 0;

export async function swapFrom(url, selectors) {
  const ticket = ++latest;
  for (const selector of selectors) document.querySelector(selector)?.setAttribute('aria-busy', 'true');
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' } });
    const html = await res.text();
    if (ticket !== latest) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const selector of selectors) {
      const target = document.querySelector(selector);
      const source = doc.querySelector(selector);
      if (target && source) target.replaceChildren(...source.childNodes);
    }
  } catch {
    if (ticket === latest) location.assign(url);
  } finally {
    if (ticket === latest) {
      for (const selector of selectors) document.querySelector(selector)?.removeAttribute('aria-busy');
    }
  }
}
