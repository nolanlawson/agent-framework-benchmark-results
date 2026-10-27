import type { Route } from "./+types/move";
import { CardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { TypeLink } from "../components/TypeBadge";
import { MISSING, orMissing, pageTitle } from "../lib/format";
import { getMovePage } from "../lib/pokeapi.server";

export async function loader({ params }: Route.LoaderArgs) {
  return getMovePage(params.name);
}

export default function MovePage({ loaderData: move }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(move.label)}</title>
      <h1>{move.label}</h1>
      <dl className="panel facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeLink type={move.type} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orMissing(move.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orMissing(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orMissing(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orMissing(move.pp)}</dd>
        </div>
      </dl>
      <Section title="Effect">
        <p>{move.effect ?? MISSING}</p>
      </Section>
      <Section title="Learned by">
        <p className="count">{move.learnedBy.length} Pokémon</p>
        <CardList cards={move.learnedBy} />
      </Section>
    </>
  );
}
