import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import MoveTable from "~/components/MoveTable";
import NotFound from "~/components/NotFound";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import { dexNumber, pageTitle } from "~/lib/format";
import { getPokemon, getPokemonMoves } from "~/lib/queries";
import type { EvolutionNode } from "~/lib/types";

const STAT_MAX = 255;

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

export const route = {
  preload: ({ params, location }) => {
    getPokemon(params.name!);
    getPokemonMoves(params.name!, new URLSearchParams(location.search).get("game") || undefined);
  },
} satisfies RouteDefinition;

function Evolution(props: { nodes: EvolutionNode[] }) {
  return (
    <ul>
      <For each={props.nodes}>
        {(node) => (
          <li>
            <A href={`/pokemon/${node.name}`}>{node.label}</A>
            <Show when={node.children.length}>
              <Evolution nodes={node.children} />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

function StatRow(props: { label: string; value: number; max: number; total?: boolean }) {
  return (
    <tr classList={{ "stat-total": props.total }}>
      <th scope="row">{props.label}</th>
      <td class="stat-value">{props.value}</td>
      <td class="stat-bar-cell" aria-hidden="true">
        <span class="stat-bar">
          <span style={{ width: `${Math.min(100, (props.value / props.max) * 100)}%` }} />
        </span>
      </td>
    </tr>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const pokemon = createAsync(() => getPokemon(params.name!));
  const moves = createAsync(() => getPokemonMoves(params.name!, param(searchParams.game)));

  return (
    <Show when={pokemon()} fallback={<NotFound />}>
      {(p) => (
        <>
          <Title>{pageTitle(p().label)}</Title>
          <div class="pokemon-hero">
            <div class="artwork">
              <Show when={p().artwork}>
                <img src={p().artwork!} alt={p().label} width="256" height="256" />
              </Show>
            </div>
            <div class="pokemon-summary">
              <p class="dex-number">{dexNumber(p().id)}</p>
              <h1>{p().label}</h1>
              <Show when={p().genus}>
                <p class="genus">{p().genus}</p>
              </Show>
              <div class="type-list">
                <For each={p().types}>{(type) => <TypeBadge type={type} />}</For>
              </div>
              <dl class="facts">
                <div>
                  <dt>Height</dt>
                  <dd>{(p().height / 10).toFixed(1)} m</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{(p().weight / 10).toFixed(1)} kg</dd>
                </div>
              </dl>
              <Show when={p().flavorText}>
                <p class="flavor">{p().flavorText}</p>
              </Show>
            </div>
          </div>

          <Section id="stats" title="Base stats">
            <table class="stats">
              <tbody>
                <For each={p().stats}>{(stat) => <StatRow label={stat.label} value={stat.value} max={STAT_MAX} />}</For>
                <StatRow
                  label="Total"
                  value={p().stats.reduce((sum, s) => sum + s.value, 0)}
                  max={STAT_MAX * Math.max(1, p().stats.length)}
                  total
                />
              </tbody>
            </table>
          </Section>

          <Section id="abilities" title="Abilities">
            <ul>
              <For each={p().abilities}>
                {(ability) => (
                  <li>
                    <A href={`/abilities/${ability.name}`}>{ability.label}</A>
                    {ability.hidden ? " (hidden)" : ""}
                  </li>
                )}
              </For>
            </ul>
          </Section>

          <Section id="evolution" title="Evolution">
            <div class="evolution">
              <Evolution nodes={[p().evolution]} />
            </div>
          </Section>

          <Section id="moves" title="Moves">
            <Show when={moves()}>
              {(m) => (
                <>
                  <div class="game-field">
                    <label for="game">Game</label>
                    <select
                      id="game"
                      onChange={(e) => setSearchParams({ game: e.currentTarget.value }, { scroll: false })}
                    >
                      <For each={m().games}>
                        {(game) => (
                          <option value={game.name} selected={game.name === m().selected}>
                            {game.label}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>
                  <Show when={m().tables.length} fallback={<p>No moves.</p>}>
                    <For each={m().tables}>{(table) => <MoveTable table={table} />}</For>
                  </Show>
                </>
              )}
            </Show>
          </Section>
        </>
      )}
    </Show>
  );
}
