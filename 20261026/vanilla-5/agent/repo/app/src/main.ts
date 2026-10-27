import './tokens.css';
import './style.css';
import { NotFoundError } from './api';
import type { Page } from './components';
import { h, replaceChildren } from './dom';
import { abilityPage } from './pages/ability';
import { homePage } from './pages/home';
import { movePage } from './pages/move';
import { errorPage, notFoundPage } from './pages/not-found';
import { pokemonPage } from './pages/pokemon';
import { typePage, typesPage } from './pages/types';
import { isShown, locationKey, markShown } from './url-state';

type Route = [pattern: RegExp, load: (match: string[], url: URL) => Promise<Page>];

const decode = (segment: string) => decodeURIComponent(segment);

const ROUTES: Route[] = [
  [/^\/$/, (_, url) => homePage(url)],
  [/^\/pokemon\/([^/]+)\/?$/, ([, name], url) => pokemonPage(decode(name), url)],
  [/^\/moves\/([^/]+)\/?$/, ([, name]) => movePage(decode(name))],
  [/^\/abilities\/([^/]+)\/?$/, ([, name]) => abilityPage(decode(name))],
  [/^\/types\/?$/, () => typesPage()],
  [/^\/types\/([^/]+)\/?$/, ([, name]) => typePage(decode(name))],
];

const main = document.getElementById('main')!;
let navigation = 0;

async function loadPage(url: URL): Promise<Page> {
  for (const [pattern, load] of ROUTES) {
    const match = url.pathname.match(pattern);
    if (!match) continue;
    try {
      return await load(match, url);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof URIError) return notFoundPage();
      console.error(err);
      return errorPage();
    }
  }
  return notFoundPage();
}

async function render(scroll: 'top' | 'hash' | 'none'): Promise<void> {
  const current = ++navigation;
  const url = new URL(location.href);
  markShown(locationKey(url));
  main.setAttribute('aria-busy', 'true');
  const loading = window.setTimeout(() => {
    if (current === navigation) replaceChildren(main, h('p', { class: 'loading' }, 'Loading…'));
  }, 150);
  const page = await loadPage(url);
  clearTimeout(loading);
  if (current !== navigation) return;

  document.title = page.title ? `${page.title} – Pokédex` : 'Pokédex';
  replaceChildren(main, page.content);
  main.removeAttribute('aria-busy');
  page.mounted?.();

  const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (target && scroll !== 'none') target.scrollIntoView();
  else if (scroll === 'top') window.scrollTo(0, 0);
}

function navigate(href: string): void {
  history.pushState(null, '', href);
  void render('top');
}

// Handle same-origin link clicks on the client.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest('a');
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  // Let the browser handle jumps within the current page.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  event.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

window.addEventListener('popstate', () => {
  // Fragment-only changes (such as following a #moves link) keep the current view.
  if (!isShown(locationKey())) void render('none');
});

history.scrollRestoration = 'auto';
void render('hash');
