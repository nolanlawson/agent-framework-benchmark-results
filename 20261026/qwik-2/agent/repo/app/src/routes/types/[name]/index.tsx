import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList } from "~/components/cards";
import { NotFound } from "~/components/not-found";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { humanize, pageTitle } from "~/lib/format";
import { api, cardsFor, englishName, slug, typeLabels, typeRef } from "~/lib/server-api";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export const useType = routeLoader$(async ({ params, status }) => {
  const type = await api(`type/${slug(params.name)}`);
  if (!type) {
    status(404);
    return null;
  }
  const [labels, cards] = await Promise.all([
    typeLabels(),
    cardsFor((type.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url }))),
  ]);
  return {
    label: englishName(type),
    relations: RELATIONS.map(([key, label]) => ({
      key,
      label,
      types: ((type.damage_relations?.[key] ?? []) as { name: string }[]).map((t) =>
        typeRef(labels, t.name),
      ),
    })),
    cards,
    moves: ((type.moves ?? []) as { name: string }[])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
});

export default component$(() => {
  const data = useType();
  const t = data.value;
  if (!t) return <NotFound />;

  return (
    <>
      <h1>{t.label}</h1>
      <Section id="damage-relations" title="Damage relations">
        <dl class="relations">
          {t.relations.map((r) => (
            <div key={r.key}>
              <dt>{r.label}</dt>
              <dd>
                {r.types.length === 0
                  ? "None"
                  : r.types.map((type) => <TypeBadge key={type.name} type={type} link />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{t.cards.length} Pokémon</p>
        <CardList cards={t.cards} />
      </Section>
      <Section id="moves" title="Moves">
        <p class="count">{t.moves.length} moves</p>
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
  return { title: pageTitle(t ? t.label : "Not found") };
};
