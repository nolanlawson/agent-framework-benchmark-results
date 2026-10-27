import type { Context } from 'hono';
import { DASH, orDash, Section, TypeBadge, TypeLinks } from '../components.js';
import {
  dexNumber,
  englishName,
  find,
  get,
  humanize,
  latestFlavorText,
  type TypeInfo,
  typeIndex,
  typeLabel,
  versionGroupOrders,
} from '../data.js';
import { notFoundPage } from './not-found.js';

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

type ChainLink = { species: { name: string }; evolves_to: ChainLink[] };

const Evolution = ({ link }: { link: ChainLink }) => (
  <li>
    <a href={`/pokemon/${link.species.name}`}>{humanize(link.species.name)}</a>
    {link.evolves_to.length > 0 && (
      <ul>
        {link.evolves_to.map((next) => (
          <Evolution link={next} />
        ))}
      </ul>
    )}
  </li>
);

const StatsTable = ({ stats }: { stats: { base_stat: number; stat: { name: string } }[] }) => {
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const row = (label: string, value: number, max: number, cls?: string) => (
    <tr class={cls}>
      <th scope="row">{label}</th>
      <td class="stats__value">{value}</td>
      <td class="stats__bar" aria-hidden="true">
        <span class="bar">
          <span class="bar__fill" style={`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`}></span>
        </span>
      </td>
    </tr>
  );
  return (
    <table class="stats">
      <tbody>
        {stats.map((s) => row(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, MAX_STAT))}
        {row('Total', total, MAX_STAT * Math.max(stats.length, 1), 'stats__total')}
      </tbody>
    </table>
  );
};

type MoveRow = {
  level: number;
  name: string;
  label: string;
  type: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

const SortHeader = ({ label, kind }: { label: string; kind: 'num' | 'text' }) => (
  <th scope="col" data-sort-kind={kind}>
    <button type="button" class="sort-button">
      {label}
      <span class="sort-indicator" aria-hidden="true"></span>
    </button>
  </th>
);

const MoveTable = ({ method, rows, types }: { method: string; rows: MoveRow[]; types: Map<string, TypeInfo> }) => {
  const levelUp = method === 'level-up';
  const num = (v: number | null) => <td data-sort={v ?? ''}>{orDash(v)}</td>;
  return (
    <div class="table-scroll">
      <table class="moves-table sortable">
        <caption>{humanize(method)}</caption>
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
          {rows.map((r) => (
            <tr>
              {levelUp && num(r.level)}
              <td data-sort={r.label}>
                <a href={`/moves/${r.name}`}>{r.label}</a>
              </td>
              <td data-sort={typeLabel(types, r.type)}>
                <TypeBadge name={r.type} label={typeLabel(types, r.type)} link />
              </td>
              <td data-sort={r.category ?? ''}>{r.category ?? DASH}</td>
              {num(r.power)}
              {num(r.accuracy)}
              {num(r.pp)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

async function loadMoves(pokemon: any, requested: string | undefined) {
  const orders = await versionGroupOrders();
  const groups = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) groups.add(d.version_group.name);
  const games = [...groups].sort((a, b) => (orders.get(a) ?? Infinity) - (orders.get(b) ?? Infinity) || a.localeCompare(b));
  const game = requested && groups.has(requested) ? requested : games[games.length - 1];

  const entries: { move: { name: string; url: string }; method: string; level: number }[] = [];
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name === game) entries.push({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const details = new Map<string, any>();
  await Promise.all(
    [...new Set(entries.map((e) => e.move.url))].map(async (url) => {
      details.set(url, await get(url));
    }),
  );

  const byMethod = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const d = details.get(e.move.url);
    const row: MoveRow = {
      level: e.level,
      name: e.move.name,
      label: englishName(d.names, e.move.name),
      type: d.type?.name,
      category: d.damage_class ? humanize(d.damage_class.name) : null,
      power: d.power ?? null,
      accuracy: d.accuracy ?? null,
      pp: d.pp ?? null,
    };
    if (!byMethod.has(e.method)) byMethod.set(e.method, []);
    byMethod.get(e.method)!.push(row);
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  const methods = [...byMethod.keys()].sort((a, b) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)));
  for (const [method, rows] of byMethod) {
    rows.sort((a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.label.localeCompare(b.label));
  }
  return { games, game, methods: methods.map((m) => ({ method: m, rows: byMethod.get(m)! })) };
}

type MovesData = Awaited<ReturnType<typeof loadMoves>>;

const MovesTables = ({ data, types }: { data: MovesData; types: Map<string, TypeInfo> }) => (
  <div id="moves-tables">
    {data.methods.length === 0 ? (
      <p>{DASH}</p>
    ) : (
      data.methods.map(({ method, rows }) => <MoveTable method={method} rows={rows} types={types} />)
    )}
  </div>
);

export async function pokemonPage(c: Context) {
  const name = c.req.param('name')!;
  const species = await find(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return notFoundPage(c);

  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, types] = await Promise.all([get(variety?.pokemon.url ?? `pokemon/${species.id}`), typeIndex()]);
  const game = c.req.query('game');
  const moves = await loadMoves(pokemon, game);

  if (c.req.header('HX-Request') && !c.req.header('HX-History-Restore-Request')) {
    c.header('Vary', 'HX-Request');
    return c.html(<MovesTables data={moves} types={types.byName} />);
  }

  const chain = species.evolution_chain ? await find(species.evolution_chain.url) : null;
  const title = englishName(species.names, species.name);
  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus;
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default;
  const pokemonTypes = [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => t.type.name);
  const abilities = [...pokemon.abilities].sort((a: any, b: any) => a.slot - b.slot);

  c.header('Vary', 'HX-Request');
  return c.render(
    <>
      <div class="hero">
        <div class="hero__art">{artwork && <img src={artwork} alt={title} width={256} height={256} />}</div>
        <div class="hero__info">
          <p class="hero__dex">{dexNumber(species.id)}</p>
          <h1>{title}</h1>
          {genus && <p class="hero__genus">{genus}</p>}
          <TypeLinks names={pokemonTypes} types={types.byName} />
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
          {flavor && <p class="hero__flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <StatsTable stats={pokemon.stats} />
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
        <ul class="evolution">
          {chain ? (
            <Evolution link={chain.chain} />
          ) : (
            <li>
              <a href={`/pokemon/${species.name}`}>{humanize(species.name)}</a>
            </li>
          )}
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        <form class="game-picker" action={`/pokemon/${species.name}#moves`} method="get">
          <label for="game">Game</label>
          <select
            id="game"
            name="game"
            hx-get={`/pokemon/${species.name}`}
            hx-trigger="change"
            hx-target="#moves-tables"
            hx-swap="outerHTML"
            hx-sync="this:replace"
            hx-push-url="true"
          >
            {moves.games.map((g) => (
              <option value={g} selected={g === moves.game}>
                {humanize(g)}
              </option>
            ))}
          </select>
          <noscript>
            <button type="submit">Show</button>
          </noscript>
        </form>
        <MovesTables data={moves} types={types.byName} />
      </Section>
    </>,
    { title, scripts: true },
  );
}
