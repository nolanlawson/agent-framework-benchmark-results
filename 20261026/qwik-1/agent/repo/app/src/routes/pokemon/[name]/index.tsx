import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound, Section, TypeBadge } from "~/components/ui";
import { MovesTable } from "~/components/moves-table";
import { pageTitle } from "~/lib/format";
import { pokemonData, type EvolutionNode } from "~/lib/pokemon";

export const usePokemon = routeLoader$(async ({ params, url, status }) => {
  const data = await pokemonData(params.name, url.searchParams.get("game"));
  if (!data) status(404);
  return data;
});

const Evolution = component$<{ node: EvolutionNode }>(({ node }) => (
  <li>
    <Link href={`/pokemon/${node.name}`}>{node.label}</Link>
    {node.children.length > 0 && (
      <ul>
        {node.children.map((child) => (
          <Evolution key={child.name} node={child} />
        ))}
      </ul>
    )}
  </li>
));

export default component$(() => {
  const data = usePokemon();
  const nav = useNavigate();
  const p = data.value;
  if (!p) return <NotFound />;

  return (
    <>
      <div class="summary">
        <div class="artwork panel">
          {p.artwork && <img src={p.artwork} alt={p.title} width={475} height={475} />}
        </div>
        <div class="summary-info">
          <p class="dex muted">{p.dex}</p>
          <h1>{p.title}</h1>
          {p.genus && <p class="muted genus">{p.genus}</p>}
          <p class="badges">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} link />
            ))}
          </p>
          <dl class="measures">
            <div>
              <dt>Height</dt>
              <dd>{p.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight}</dd>
            </div>
          </dl>
          {p.flavor && <p class="flavor">{p.flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td class="stat-bar-cell" aria-hidden="true">
                  <span class="stat-bar">
                    <span style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr class="stat-total">
              <th scope="row">Total</th>
              <td class="stat-value">{p.total}</td>
              <td class="stat-bar-cell" aria-hidden="true">
                <span class="stat-bar">
                  <span style={{ width: `${Math.min(100, (p.total / (255 * 6)) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-list">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link href={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul class="evolution">
          <Evolution node={p.evolution} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {p.games.length > 0 ? (
          <>
            <div class="game-field">
              <label for="game">Game</label>
              <select
                id="game"
                onChange$={(_, el) =>
                  nav(`/pokemon/${p.name}?game=${encodeURIComponent(el.value)}`, {
                    replaceState: true,
                    scroll: false,
                  })
                }
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name} selected={g.name === p.game}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {p.tables.map((t) => (
              <MovesTable key={`${p.game}-${t.method}`} table={t} />
            ))}
          </>
        ) : (
          <p class="muted">No moves.</p>
        )}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const p = resolveValue(usePokemon);
  return { title: pageTitle(p ? p.title : "Not found") };
};
