import { englishName, getMove, getTypeNames, humanize, latestFlavorText, shortEffect } from '../api';
import { cardList, countText, MISSING, section, typeBadge } from '../components';
import { html } from '../html';
import type { Page, PageContext } from '../router';
import { speciesCards } from './shared';

export async function movePage({ params: [name] }: PageContext): Promise<Page> {
  const move = await getMove(name);
  const [typeNames, cards] = await Promise.all([
    getTypeNames(),
    speciesCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const title = englishName(move);
  const show = (value: number | null) => (value == null ? MISSING : value);
  return {
    title,
    body: html`<h1>${title}</h1>
      <dl class="facts panel panel--compact">
        <div><dt>Type</dt><dd>${typeBadge(move.type.name, typeNames.get(move.type.name) ?? humanize(move.type.name))}</dd></div>
        <div><dt>Category</dt><dd>${move.damage_class ? humanize(move.damage_class.name) : MISSING}</dd></div>
        <div><dt>Power</dt><dd>${show(move.power)}</dd></div>
        <div><dt>Accuracy</dt><dd>${show(move.accuracy)}</dd></div>
        <div><dt>PP</dt><dd>${show(move.pp)}</dd></div>
      </dl>
      ${section('effect', 'Effect', html`<p>${shortEffect(move) ?? latestFlavorText(move.flavor_text_entries) ?? MISSING}</p>`)}
      ${section('learned-by', 'Learned by', html`${countText(cards.length)}${cardList(cards)}`)}`,
  };
}
