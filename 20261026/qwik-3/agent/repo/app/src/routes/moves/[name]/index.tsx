import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { PokemonCards } from "~/components/pokemon-cards";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { api, cardsForPokemon, typeLabels } from "~/lib/api";
import { EM_DASH, cleanText, englishEntry, englishName, humanize, latestFlavorText, orDash, title } from "~/lib/format";

export const useMove = routeLoader$(async ({ params, status }) => {
  const move = await api(`move/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!move) {
    status(404);
    return null;
  }
  const [labels, cards] = await Promise.all([
    typeLabels(),
    cardsForPokemon((move.learned_by_pokemon ?? []).map((pokemon: any) => ({ pokemon }))),
  ]);
  const shortEffect = englishEntry<any>(move.effect_entries)?.short_effect as string | undefined;
  const effect = shortEffect
    ? cleanText(shortEffect.replaceAll("$effect_chance", String(move.effect_chance ?? "")))
    : latestFlavorText(move.flavor_text_entries) ?? EM_DASH;
  const type = move.type?.name as string | undefined;
  return {
    label: englishName(move),
    type: type ? { name: type, label: labels.get(type) ?? humanize(type) } : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect,
    cards,
  };
});

export default component$(() => {
  const data = useMove();
  const m = data.value;
  if (!m) return <NotFound />;
  return (
    <>
      <h1>{m.label}</h1>
      <dl class="panel facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>{m.type ? <TypeBadge name={m.type.name} label={m.type.label} link /> : EM_DASH}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orDash(m.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(m.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(m.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(m.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{m.effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p class="muted count">{m.cards.length} Pokémon</p>
        <PokemonCards cards={m.cards} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const m = resolveValue(useMove);
  return { title: title(m ? m.label : "Not found") };
};
