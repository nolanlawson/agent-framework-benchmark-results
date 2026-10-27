import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section, TypeBadge } from "~/components/ui";
import { typeData } from "~/lib/details";
import { pageTitle } from "~/lib/format";

export const useType = routeLoader$(async ({ params, status }) => {
  const data = await typeData(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const t = useType().value;
  if (!t) return <NotFound />;
  return (
    <>
      <h1>{t.title}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {t.relations.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd class="badges">
                {r.types.length
                  ? r.types.map((x) => <TypeBadge key={x.name} type={x} link />)
                  : "None"}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="muted count">{t.cards.length} Pokémon</p>
        <CardList cards={t.cards} />
      </Section>
      <Section id="moves" title="Moves">
        <p class="muted count">{t.moves.length} moves</p>
        <ul class="move-columns">
          {t.moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const t = resolveValue(useType);
  return { title: pageTitle(t ? t.title : "Not found") };
};
