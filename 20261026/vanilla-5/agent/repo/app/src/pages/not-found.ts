import type { Page } from '../components';
import { h } from '../dom';

export function notFoundPage(): Page {
  return {
    title: 'Not found',
    content: [h('h1', null, 'Not found'), h('p', null, h('a', { href: '/' }, 'Back to the Pokédex'))],
  };
}

export function errorPage(): Page {
  return {
    title: 'Something went wrong',
    content: [
      h('h1', null, 'Something went wrong'),
      h('p', null, 'The Pokédex couldn’t load this page. ', h('a', { href: location.href }, 'Try again'), ' or ', h('a', { href: '/' }, 'go home'), '.'),
    ],
  };
}
