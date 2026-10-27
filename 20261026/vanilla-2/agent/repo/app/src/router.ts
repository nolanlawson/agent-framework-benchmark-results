import { NotFoundError } from './api';
import { html, SafeHtml } from './html';

export interface PageContext {
  url: URL;
  params: string[];
  /** The main element to render into. */
  main: HTMLElement;
  /** False once the user has navigated elsewhere; async work should stop rendering. */
  isCurrent: () => boolean;
}

export interface Page {
  /** Main heading, used for the document title. */
  title: string;
  /** `null` for the home page, whose document title is just "Pokédex". */
  documentTitle?: string | null;
  body: SafeHtml;
  /** Runs after the body is in the document (event handlers, follow-up rendering). */
  mount?: (main: HTMLElement) => void;
}

type Loader = (ctx: PageContext) => Promise<Page>;

const routes: [RegExp, Loader][] = [];

export function route(pattern: RegExp, loader: Loader) {
  routes.push([pattern, loader]);
}

export const notFoundPage = (): Page => ({
  title: 'Not found',
  body: html`<h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>`,
});

const errorPage = (): Page => ({
  title: 'Something went wrong',
  body: html`<h1>Something went wrong</h1>
    <p>The Pokédex data couldn’t be loaded. <a href="">Try again</a> or go <a href="/">back to the Pokédex</a>.</p>`,
});

let navigation = 0;

export function setTitle(heading: string | null) {
  document.title = heading ? `${heading} – Pokédex` : 'Pokédex';
}

async function render(scroll: 'top' | 'restore' | 'none') {
  const id = ++navigation;
  const isCurrent = () => id === navigation;
  const url = new URL(location.href);
  const main = document.getElementById('main')!;
  let page: Page;
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
  const match = routes.map(([pattern, loader]) => [pathname.match(pattern), loader] as const).find(([m]) => m);
  if (!match) page = notFoundPage();
  else {
    const [params, loader] = match;
    main.setAttribute('aria-busy', 'true');
    try {
      page = await loader({ url, params: params!.slice(1).map(decodeURIComponent), main, isCurrent });
    } catch (err) {
      if (!isCurrent()) return;
      if (err instanceof NotFoundError) page = notFoundPage();
      else {
        console.error(err);
        page = errorPage();
      }
    }
  }
  if (!isCurrent()) return;
  main.removeAttribute('aria-busy');
  setTitle(page.documentTitle === undefined ? page.title : page.documentTitle);
  main.innerHTML = page.body.value;
  page.mount?.(main);
  if (url.hash) {
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
  } else if (scroll === 'top') {
    window.scrollTo(0, 0);
  }
}

export function navigate(href: string, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', href);
  else history.pushState(null, '', href);
  render('top');
}

/** Updates the URL without re-rendering the page (the page already reflects the change). */
export function updateUrl(href: string, { replace = false } = {}) {
  if (replace) history.replaceState(history.state, '', href);
  else history.pushState(history.state, '', href);
}

export function start() {
  history.scrollRestoration = 'auto';
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest?.('a');
    if (!link || !link.href || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    // Same-page hash links keep native behavior.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
  window.addEventListener('popstate', () => render('none'));
  render('none');
}
