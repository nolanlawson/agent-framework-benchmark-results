import { createAsync, useLocation, useNavigate, useParams, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { MoveTables } from "~/components/MoveTables";
import { Facts, NotFound, PageTitle, Section, TypeBadges } from "~/components/ui";
import { getPokemon, getPokemonMoves } from "~/lib/data";
import { dexNumber, orMissing } from "~/lib/format";
import type { EvolutionNode, PokemonPage } from "~/lib/types";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export const route = {
  preload: ({ params, location }) => {
    getPokemon(params.name!);
    getPokemonMoves(params.name!, one(location.query.game));
  },
} satisfies RouteDefinition;

// Bars are scaled to the highest possible base stat.
const STAT_MAX = 255;

function EvolutionItem(props: { node: EvolutionNode }) {
  return (
    <li>
      <a href={`/pokemon/${props.node.name}`}>{props.node.label}</a>
      <Show when={props.node.children.length}>
        <ul>
          <For each={props.node.children}>{(child) => <EvolutionItem node={child} />}</For>
        </ul>
      </Show>
    </li>
  );
}

function Stats(props: { stats: PokemonPage["stats"] }) {
  const total = () => props.stats.reduce((sum, s) => sum + s.value, 0);
  const Row = (p: { label: string; value: number; max: number; total?: boolean }) => (
    <tr classList={{ "stats__total": p.total }}>
      <th scope="row">{p.label}</th>
      <td class="stats__value">{p.value}</td>
      <td class="stats__bar" aria-hidden="true">
        <span class="stat-bar">
          <span class="stat-bar__fill" style={{ width: `${Math.min(100, (p.value / p.max) * 100)}%` }} />
        </span>
      </td>
    </tr>
  );
  return (
    <table class="stats">
      <tbody>
        <For each={props.stats}>{(s) => <Row label={s.label} value={s.value} max={STAT_MAX} />}</For>
        <Row label="Total" value={total()} max={STAT_MAX * Math.max(1, props.stats.length)} total />
      </tbody>
    </table>
  );
}

export default function PokemonRoute() {
  const params = useParams<{ name: string }>();
  const [search] = useSearchParams<{ game?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const pokemon = createAsync(() => getPokemon(params.name));
  const moves = createAsync(() => getPokemonMoves(params.name, one(search.game)));

  const selectGame = (game: string) => {
    const query = new URLSearchParams(location.search);
    query.set("game", game);
    navigate(`${location.pathname}?${query}${location.hash}`, { replace: true, scroll: false });
  };

  return (
    <Show when={pokemon() !== undefined}>
      <Show when={pokemon()} fallback={<NotFound />}>
        {(p) => (
          <>
            <PageTitle heading={p().label} />
            <div class="hero">
              <div class="hero__art">
                <Show when={p().artwork}>
                  <img src={p().artwork!} alt={p().label} width="475" height="475" />
                </Show>
              </div>
              <div class="hero__info">
                <p class="hero__dex">{dexNumber(p().id)}</p>
                <h1 class="hero__title">{p().label}</h1>
                <Show when={p().genus}>
                  <p class="hero__genus">{p().genus}</p>
                </Show>
                <TypeBadges types={p().types} link />
                <Facts
                  class="hero__facts"
                  items={[
                    ["Height", `${(p().height / 10).toFixed(1)} m`],
                    ["Weight", `${(p().weight / 10).toFixed(1)} kg`],
                  ]}
                />
                <Show when={p().flavor}>
                  <p class="hero__flavor">{p().flavor}</p>
                </Show>
              </div>
            </div>

            <Section id="stats" title="Base stats">
              <Stats stats={p().stats} />
            </Section>

            <Section id="abilities" title="Abilities">
              <ul class="bullets">
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
              <Show when={p().evolution}>
                {(node) => (
                  <ul class="bullets evolution">
                    <EvolutionItem node={node()} />
                  </ul>
                )}
              </Show>
            </Section>

            <Section id="moves" title="Moves">
              <Show when={p().games.length} fallback={<p class="muted">{orMissing(null)}</p>}>
                <div class="inline-field">
                  <label for="game">Game</label>
                  <select id="game" onChange={(e) => selectGame(e.currentTarget.value)}>
                    <For each={p().games}>
                      {(g) => (
                        <option value={g.name} selected={moves()?.game === g.name}>
                          {g.label}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
                <Show when={moves()}>{(m) => <MoveTables tables={m().tables} />}</Show>
              </Show>
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
