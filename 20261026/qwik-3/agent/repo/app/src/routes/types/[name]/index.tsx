import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { PokemonCards } from "~/components/pokemon-cards";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { api, cardsForPokemon, typeLabels } from "~/lib/api";
import { englishName, humanize, title, type NamedRef } from "~/lib/format";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export const useType = routeLoader$(async ({ params, status }) => {
  const type = await api(`type/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!type) {
    status(404);
    return null;
  }
  const [labels, cards] = await Promise.all([typeLabels(), cardsForPokemon(type.pokemon ?? [])]);
  const label = (name: string) => labels.get(name) ?? humanize(name);
  return {
    label: englishName(type),
    relations: RELATIONS.map(([key, term]) => ({
      term,
      types: ((type.damage_relations?.[key] ?? []) as NamedRef[]).map((t) => ({ name: t.name, label: label(t.name) })),
    })),
    cards,
    moves: ((type.moves ?? []) as NamedRef[])
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
      <Section id="damage" title="Damage relations">
        <dl class="relations">
          {t.relations.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0
                  ? "None"
                  : r.types.map((rt) => <TypeBadge key={rt.name} name={rt.name} label={rt.label} link />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="muted count">{t.cards.length} Pokémon</p>
        <PokemonCards cards={t.cards} />
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
  return { title: title(t ? t.label : "Not found") };
};
