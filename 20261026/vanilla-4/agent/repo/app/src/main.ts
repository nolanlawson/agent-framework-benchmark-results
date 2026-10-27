import './tokens.css';
import './styles.css';
import { NotFoundError } from './api';
import { h } from './dom';
import { homePage } from './pages/home';
import { pokemonPage } from './pages/pokemon';
import { movePage } from './pages/move';
import { abilityPage } from './pages/ability';
import { typePage, typesPage } from './pages/types';

export type Page = (params: string[], url: URL) => Promise<Node>;

const routes: [RegExp, Page][] = [
  [/^\/$/, homePage],
  [/^\/pokemon\/([^/]+)\/?$/, pokemonPage],
  [/^\/moves\/([^/]+)\/?$/, movePage],
  [/^\/abilities\/([^/]+)\/?$/, abilityPage],
  [/^\/types\/?$/, typesPage],
  [/^\/types\/([^/]+)\/?$/, typePage],
];

const main = document.getElementById('main')!;
let renderToken = 0;

function notFound() {
  return h(
    'div',
    { class: 'not-found' },
    h('h1', null, 'Not found'),
    h('p', null, h('a', { href: '/' }, 'Back to the Pokédex')),
  );
}

function setTitle() {
  const h1 = main.querySelector('h1')?.textContent?.trim();
  document.title = !h1 || location.pathname === '/' ? 'Pokédex' : `${h1} – Pokédex`;
}

async function render(scroll: 'top' | 'keep' | 'hash') {
  const token = ++renderToken;
  const url = new URL(location.href);
  let content: Node;
  const match = routes
    .map(([re, page]) => [url.pathname.match(re), page] as const)
    .find(([m]) => m);
  main.setAttribute('aria-busy', 'true');
  try {
    if (!match) content = notFound();
    else {
      const params = match[0]!.slice(1).map((p) => decodeURIComponent(p).toLowerCase());
      content = await match[1](params, url);
    }
  } catch (err) {
    if (!(err instanceof NotFoundError)) console.error(err);
    content =
      err instanceof NotFoundError
        ? notFound()
        : h('div', null, h('h1', null, 'Something went wrong'), h('p', null, 'The Pokédex data could not be loaded.'));
  }
  if (token !== renderToken) return;
  main.replaceChildren(content);
  main.removeAttribute('aria-busy');
  setTitle();
  if (scroll === 'hash' && location.hash) {
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } else if (scroll === 'top') {
    window.scrollTo(0, 0);
  }
}

export function navigate(href: string, replace = false) {
  const url = new URL(href, location.href);
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  render(url.hash ? 'hash' : 'top');
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest?.('a');
  if (!a || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  e.preventDefault();
  navigate(url.href);
});

window.addEventListener('popstate', () => render('keep'));

history.scrollRestoration = 'manual';
render('hash');
