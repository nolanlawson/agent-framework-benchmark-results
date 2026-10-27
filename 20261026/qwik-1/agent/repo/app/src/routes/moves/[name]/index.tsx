import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section, TypeBadge } from "~/components/ui";
import { moveData } from "~/lib/details";
import { orDash, pageTitle } from "~/lib/format";

export const useMove = routeLoader$(async ({ params, status }) => {
  const data = await moveData(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const m = useMove().value;
  if (!m) return <NotFound />;
  return (
    <>
      <h1>{m.title}</h1>
      <dl class="facts panel">
        <div>
          <dt>Type</dt>
          <dd>{m.type ? <TypeBadge type={m.type} link /> : "—"}</dd>
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
        <CardList cards={m.cards} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const m = resolveValue(useMove);
  return { title: pageTitle(m ? m.title : "Not found") };
};
