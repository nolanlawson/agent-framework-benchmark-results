import { createAsync, useParams, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { MoveTable } from "~/components/MoveTable";
import { NotFound } from "~/components/NotFound";
import { PageTitle } from "~/components/PageTitle";
import { Section } from "~/components/Section";
import { TypeBadge } from "~/components/TypeBadge";
import { dexNumber } from "~/lib/format";
import { getPokemon, getPokemonMoves } from "~/lib/queries";
import type { EvolutionNode } from "~/lib/types";

const MAX_STAT = 255;

const gameParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || null;

export const route = {
  preload: ({ params, location }) => {
    getPokemon(params.name!);
    getPokemonMoves(params.name!, new URLSearchParams(location.search).get("game"));
  },
} satisfies RouteDefinition;

function StatBar(props: { value: number; max: number }) {
  return (
    <span class="stats__track">
      <span class="stats__fill" style={{ width: `${Math.min(100, (props.value / props.max) * 100)}%` }} />
    </span>
  );
}

function Evolution(props: { nodes: EvolutionNode[] }) {
  return (
    <ul class="evolution">
      <For each={props.nodes}>
        {(node) => (
          <li>
            <a href={`/pokemon/${node.name}`}>{node.label}</a>
            <Show when={node.children.length}>
              <Evolution nodes={node.children} />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const pokemon = createAsync(() => getPokemon(params.name!));
  const moves = createAsync(() => getPokemonMoves(params.name!, gameParam(search.game)));

  return (
    <Show when={pokemon()} fallback={<Show when={pokemon() === null}><NotFound /></Show>}>
      {(p) => (
        <>
          <PageTitle heading={p().title} />
          <div class="summary">
            <div class="summary__artwork">
              <Show when={p().artwork}>
                <img src={p().artwork!} alt={p().title} width="475" height="475" />
              </Show>
            </div>
            <div class="summary__info">
              <p class="summary__number">{dexNumber(p().id)}</p>
              <h1 class="page-title summary__title">{p().title}</h1>
              <Show when={p().genus}>
                <p class="summary__genus">{p().genus}</p>
              </Show>
              <p class="type-badges">
                <For each={p().types}>{(t) => <TypeBadge type={t} />}</For>
              </p>
              <dl class="facts">
                <div>
                  <dt>Height</dt>
                  <dd>{p().height}</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{p().weight}</dd>
                </div>
              </dl>
              <Show when={p().flavor}>
                <p class="summary__flavor">{p().flavor}</p>
              </Show>
            </div>
          </div>

          <Section id="stats" title="Base stats">
            <table class="stats">
              <tbody>
                <For each={p().stats}>
                  {(stat) => (
                    <tr>
                      <th scope="row">{stat.label}</th>
                      <td>{stat.value}</td>
                      <td class="stats__bar" aria-hidden="true">
                        <StatBar value={stat.value} max={MAX_STAT} />
                      </td>
                    </tr>
                  )}
                </For>
                <tr class="stats__total">
                  <th scope="row">Total</th>
                  <td>{p().total}</td>
                  <td class="stats__bar" aria-hidden="true">
                    <StatBar value={p().total} max={MAX_STAT * Math.max(1, p().stats.length)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="abilities" title="Abilities">
            <ul class="plain-list">
              <For each={p().abilities}>
                {(a) => (
                  <li>
                    <a href={`/abilities/${a.name}`}>{a.label}</a>
                    {a.hidden ? " (hidden)" : ""}
                  </li>
                )}
              </For>
            </ul>
          </Section>

          <Section id="evolution" title="Evolution">
            <Show when={p().evolution} fallback={<p>—</p>}>
              <Evolution nodes={[p().evolution!]} />
            </Show>
          </Section>

          <Section id="moves" title="Moves">
            <Show when={moves()}>
              {(m) => (
                <>
                  <Show when={m().games.length} fallback={<p>—</p>}>
                    <div class="field field--inline">
                      <label for="game">Game</label>
                      <select
                        id="game"
                        name="game"
                        onChange={(e) => setSearch({ game: e.currentTarget.value }, { scroll: false })}
                      >
                        <For each={m().games}>
                          {(g) => (
                            <option value={g.name} selected={g.name === m().selected}>
                              {g.label}
                            </option>
                          )}
                        </For>
                      </select>
                    </div>
                  </Show>
                  <For each={m().tables}>{(table) => <MoveTable table={table} />}</For>
                </>
              )}
            </Show>
          </Section>
        </>
      )}
    </Show>
  );
}
