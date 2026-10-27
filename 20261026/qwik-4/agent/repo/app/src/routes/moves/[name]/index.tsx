import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { CardList } from "~/components/pokemon-card";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import {
  api,
  cleanText,
  englishName,
  getTypeLabels,
  latestEnglishFlavorText,
  speciesCards,
  typeRef,
  type NamedRef,
} from "~/lib/api";
import { EM_DASH, humanize, orDash, pageTitle } from "~/lib/format";

export const useMove = routeLoader$(async ({ params, fail }) => {
  const move = await api(`move/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!move || move.name !== params.name.toLowerCase()) return fail(404, { notFound: true as const });

  const typeLabels = await getTypeLabels();
  const shortEffect = (move.effect_entries as { short_effect: string; language: NamedRef }[])
    ?.find((e) => e.language.name === "en")
    ?.short_effect?.replaceAll("$effect_chance", String(move.effect_chance ?? ""));

  return {
    notFound: false as const,
    name: englishName(move.names, move.name),
    type: move.type ? typeRef(typeLabels, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect: (shortEffect && cleanText(shortEffect)) || latestEnglishFlavorText(move.flavor_text_entries) || EM_DASH,
    learnedBy: await speciesCards((move.learned_by_pokemon as NamedRef[]).map((pokemon) => ({ pokemon }))),
  };
});

export default component$(() => {
  const data = useMove();
  const m = data.value;
  if (m.notFound) return <NotFound />;

  return (
    <>
      <h1>{m.name}</h1>
      <div class="panel panel-compact">
        <dl class="facts">
          <div>
            <dt>Type</dt>
            <dd>{m.type ? <TypeBadge type={m.type} /> : EM_DASH}</dd>
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
      </div>
      <Section id="effect" title="Effect">
        <p>{m.effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p class="count">{m.learnedBy.length} Pokémon</p>
        <CardList cards={m.learnedBy} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMove);
  return { title: pageTitle(data.notFound ? "Not found" : data.name) };
};
