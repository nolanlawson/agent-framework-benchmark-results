import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { CardList } from "~/components/pokemon-card";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { api, englishName, getTypeLabels, getTypeList, speciesCards, typeRef, type NamedRef } from "~/lib/api";
import { humanize, pageTitle } from "~/lib/format";

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
] as const;

export const useType = routeLoader$(async ({ params, fail }) => {
  const name = params.name.toLowerCase();
  const [list, labels] = await Promise.all([getTypeList(), getTypeLabels()]);
  // Only the 18 types have pages.
  const type = list.some((t) => t.name === name) ? await api(`type/${name}`) : null;
  if (!type) return fail(404, { notFound: true as const });

  return {
    notFound: false as const,
    name: englishName(type.names, type.name),
    relations: RELATIONS.map(([label, key]) => ({
      label,
      types: ((type.damage_relations?.[key] ?? []) as NamedRef[]).map((t) => typeRef(labels, t.name)),
    })),
    pokemon: await speciesCards(type.pokemon as { pokemon: NamedRef }[]),
    moves: (type.moves as NamedRef[])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
});

export default component$(() => {
  const data = useType();
  const t = data.value;
  if (t.notFound) return <NotFound />;

  return (
    <>
      <h1>{t.name}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {t.relations.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>
                {r.types.length ? (
                  <span class="badges">
                    {r.types.map((rt) => (
                      <TypeBadge key={rt.name} type={rt} />
                    ))}
                  </span>
                ) : (
                  "None"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{t.pokemon.length} Pokémon</p>
        <CardList cards={t.pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <p class="count">{t.moves.length} moves</p>
        <ul class="move-columns" role="list">
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
  const data = resolveValue(useType);
  return { title: pageTitle(data.notFound ? "Not found" : data.name) };
};
