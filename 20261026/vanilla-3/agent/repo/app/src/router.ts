// Client-side router: matches the path, renders the page into <main>, and
// intercepts same-origin link clicks so navigation doesn't reload the app.

import { NotFoundError } from './api';
import { h } from './dom';
import { pageTitle } from './components';

export interface View {
  /** The page's h1 text; also used for the document title. */
  title: string;
  node: Node;
  /** Document title override (the home page is just "Pokédex"). */
  documentTitle?: string;
}

export interface RouteContext {
  params: string[];
  url: URL;
  /** True while this render is still the current navigation. */
  isCurrent: () => boolean;
}

type PageFn = (ctx: RouteContext) => Promise<View>;

const routes: [RegExp, PageFn][] = [];

export function route(pattern: RegExp, page: PageFn): void {
  routes.push([pattern, page]);
}

export function notFoundView(): View {
  return {
    title: 'Not found',
    node: h(
      'div',
      { class: 'stack' },
      pageTitle('Not found'),
      h('p', null, h('a', { href: '/' }, 'Back to the Pokédex')),
    ),
  };
}

function errorView(): View {
  return {
    title: 'Something went wrong',
    node: h(
      'div',
      { class: 'stack' },
      pageTitle('Something went wrong'),
      h('p', null, 'The Pokédex data could not be loaded. ', h('a', { href: location.href }, 'Try again'), '.'),
    ),
  };
}

let navigation = 0;
const main = () => document.getElementById('main')!;

export function setDocumentTitle(view: View): void {
  document.title = view.documentTitle ?? `${view.title} – Pokédex`;
}

export async function render(): Promise<void> {
  const token = ++navigation;
  const isCurrent = () => token === navigation;
  const url = new URL(location.href);
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {}
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');

  const container = main();
  container.setAttribute('aria-busy', 'true');
  if (!container.firstChild) container.append(h('p', { class: 'loading' }, 'Loading…'));

  let view: View;
  const match = routes.map(([pattern, page]) => [pathname.match(pattern), page] as const).find(([m]) => m);
  if (!match) {
    view = notFoundView();
  } else {
    try {
      view = await match[1]({ params: match[0]!.slice(1), url, isCurrent });
    } catch (err) {
      if (err instanceof NotFoundError) view = notFoundView();
      else {
        console.error(err);
        view = errorView();
      }
    }
  }
  if (!isCurrent()) return;

  container.replaceChildren(view.node);
  container.removeAttribute('aria-busy');
  setDocumentTitle(view);

  if (url.hash.length > 1) {
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
  } else if (pendingScrollTop) {
    window.scrollTo(0, 0);
  }
  pendingScrollTop = false;
}

let pendingScrollTop = false;

export function navigate(href: string, { replace = false } = {}): void {
  const next = new URL(href, location.href);
  if (replace) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
  pendingScrollTop = true;
  void render();
}

export function startRouter(): void {
  history.scrollRestoration = 'auto';
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // Same-page hash links scroll natively.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    navigate(url.href);
  });
  window.addEventListener('popstate', () => void render());
  void render();
}
