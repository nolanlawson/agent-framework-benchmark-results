import {
  dexNumber,
  englishName,
  get,
  humanize,
  latestFlavorText,
  moveInfo,
  typeLabel,
  type MoveInfo,
} from '../api';
import { display, Layout, Section, TypeBadge } from '../components';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

type Chain = { species: { name: string }; evolves_to: Chain[] };

const EvolutionList = ({ nodes }: { nodes: Chain[] }) => (
  <ul>
    {nodes.map((node) => (
      <li>
        <a href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</a>
        {node.evolves_to.length > 0 && <EvolutionList nodes={node.evolves_to} />}
      </li>
    ))}
  </ul>
);

type MoveRow = MoveInfo & { level: number };
type MoveTable = { method: string; label: string; rows: MoveRow[] };

/** Version groups the Pokémon learns moves in, ordered by the version group's `order`. */
async function versionGroups(pokemon: any): Promise<{ name: string; order: number }[]> {
  const names = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) names.add(d.version_group.name);
  const groups = await Promise.all(
    [...names].map(async (name) => {
      const vg = await get(`version-group/${name}`);
      return { name, order: vg.order as number };
    }),
  );
  return groups.sort((a, b) => a.order - b.order);
}

async function moveTables(pokemon: any, game: string): Promise<MoveTable[]> {
  const entries: { move: string; method: string; level: number }[] = [];
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      const method = d.move_learn_method.name;
      const level = d.level_learned_at;
      if (entries.some((e) => e.move === m.move.name && e.method === method && (method !== 'level-up' || e.level === level))) continue;
      entries.push({ move: m.move.name, method, level });
    }
  }
  const infos = new Map(
    await Promise.all([...new Set(entries.map((e) => e.move))].map(async (name) => [name, await moveInfo(name)] as const)),
  );
  const byMethod = new Map<string, MoveRow[]>();
  for (const e of entries) {
    if (!byMethod.has(e.method)) byMethod.set(e.method, []);
    byMethod.get(e.method)!.push({ ...infos.get(e.move)!, level: e.level });
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  return [...byMethod.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.label.localeCompare(b.label)),
    }));
}

const SortHeader = ({ label, kind }: { label: string; kind: 'num' | 'text' }) => (
  <th scope="col">
    <button type="button" class="sort" data-kind={kind}>
      {label}
    </button>
  </th>
);

const MovesTable = ({ table }: { table: MoveTable }) => {
  const levelUp = table.method === 'level-up';
  return (
    <div class="table-scroll">
      <table class="moves">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {levelUp && <SortHeader label="Level" kind="num" />}
            <SortHeader label="Move" kind="text" />
            <SortHeader label="Type" kind="text" />
            <SortHeader label="Category" kind="text" />
            <SortHeader label="Power" kind="num" />
            <SortHeader label="Accuracy" kind="num" />
            <SortHeader label="PP" kind="num" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr>
              {levelUp && <td data-v={r.level}>{r.level}</td>}
              <td data-v={r.label}>
                <a href={`/moves/${r.name}`}>{r.label}</a>
              </td>
              <td data-v={r.type.label}>
                <TypeBadge type={r.type} link />
              </td>
              <td data-v={r.category ?? ''}>{display(r.category)}</td>
              <td data-v={r.power ?? ''}>{display(r.power)}</td>
              <td data-v={r.accuracy ?? ''}>{display(r.accuracy)}</td>
              <td data-v={r.pp ?? ''}>{display(r.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export async function loadPokemon(name: string, requestedGame?: string) {
  const species = await get(`pokemon-species/${encodeURIComponent(name)}`);
  const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
  const [pokemon, chain] = await Promise.all([
    get(variety.pokemon.url),
    species.evolution_chain ? get(species.evolution_chain.url).catch(() => null) : null,
  ]);
  const games = await versionGroups(pokemon);
  const game = games.some((g) => g.name === requestedGame) ? requestedGame! : games.at(-1)?.name;
  const [types, tables] = await Promise.all([
    Promise.all(
      [...pokemon.types]
        .sort((a: any, b: any) => a.slot - b.slot)
        .map(async (t: any) => ({ name: t.type.name, label: await typeLabel(t.type.name) })),
    ),
    game ? moveTables(pokemon, game) : [],
  ]);
  return { species, pokemon, chain: chain?.chain as Chain | undefined, games, game, types, tables };
}

type Data = Awaited<ReturnType<typeof loadPokemon>>;

export const MovesBody = ({ data }: { data: Data }) => (
  <div id="moves-body">
    {data.tables.length === 0 ? <p>No moves.</p> : data.tables.map((t) => <MovesTable table={t} />)}
  </div>
);

export const PokemonPage = ({ data }: { data: Data }) => {
  const { species, pokemon, chain, games, game, types } = data;
  const name = englishName(species);
  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus;
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default;
  const stats = pokemon.stats.map((s: any) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat as number }));
  const total = stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0);
  const abilities = [...pokemon.abilities].sort((a: any, b: any) => a.slot - b.slot);

  return (
    <Layout title={name}>
      <div class="summary">
        <div class="artwork">{artwork && <img src={artwork} alt={name} width={288} height={288} />}</div>
        <div class="summary-text">
          <p class="dex">{dexNumber(species.id)}</p>
          <h1>{name}</h1>
          {genus && <p class="genus">{genus}</p>}
          <p class="badges">
            {types.map((t) => (
              <TypeBadge type={t} link />
            ))}
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavor && <p class="flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats">
          <tbody>
            {stats.map((s: { label: string; value: number }) => (
              <tr>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td class="stat-bar" aria-hidden="true">
                  <span class="bar">
                    <span style={`width: ${Math.min(100, (s.value / MAX_STAT) * 100).toFixed(1)}%`}></span>
                  </span>
                </td>
              </tr>
            ))}
            <tr class="total">
              <th scope="row">Total</th>
              <td class="stat-value">{total}</td>
              <td class="stat-bar" aria-hidden="true">
                <span class="bar">
                  <span style={`width: ${Math.min(100, (total / (MAX_STAT * 6)) * 100).toFixed(1)}%`}></span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-list">
          {abilities.map((a: any) => (
            <li>
              <a href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</a>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <div class="evolution">
          {chain ? (
            <EvolutionList nodes={[chain]} />
          ) : (
            <ul>
              <li>
                <a href={`/pokemon/${species.name}`}>{humanize(species.name)}</a>
              </li>
            </ul>
          )}
        </div>
      </Section>

      <Section id="moves" title="Moves">
        <form class="game-form" action={`/pokemon/${species.name}#moves`} method="get">
          <label for="game">Game</label>
          <select
            id="game"
            name="game"
            hx-get={`/pokemon/${species.name}`}
            hx-trigger="change"
            hx-target="#moves-body"
            hx-select="#moves-body"
            hx-swap="outerHTML"
            hx-push-url="true"
            hx-sync="this:replace"
          >
            {games.map((g) => (
              <option value={g.name} selected={g.name === game}>
                {humanize(g.name)}
              </option>
            ))}
          </select>
          <noscript>
            <button type="submit">Show</button>
          </noscript>
        </form>
        <MovesBody data={data} />
      </Section>
    </Layout>
  );
};
