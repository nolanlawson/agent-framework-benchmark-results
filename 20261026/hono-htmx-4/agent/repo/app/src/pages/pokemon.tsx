import type { FC } from 'hono/jsx';
import {
  dexNumber,
  englishName,
  getEvolutionChain,
  getMove,
  getPokemon,
  getSpecies,
  getTypeLabels,
  getVersionGroup,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  mapAll,
  type ChainLink,
  type Move,
  type Pokemon,
  type Species,
} from '../api.js';
import { dash, Section, TypeBadge } from '../components.js';

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

export type PokemonData = { species: Species; pokemon: Pokemon };

/** Looks a Pokémon page up by species name (or ID); null when the API doesn't have it. */
export async function loadPokemon(name: string): Promise<PokemonData | null> {
  const species = await getSpecies(name);
  if (!species) return null;
  const variety = species.varieties.find((v) => v.is_default)?.pokemon;
  const pokemon = await getPokemon(variety ? idFromUrl(variety.url) : species.id);
  return pokemon ? { species, pokemon } : null;
}

export const PokemonPage: FC<{ data: PokemonData; game: string | null }> = async ({ data, game }) => {
  const { species, pokemon } = data;
  const name = englishName(species);
  const typeLabels = await getTypeLabels();
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const chain = species.evolution_chain ? await getEvolutionChain(idFromUrl(species.evolution_chain.url)) : null;

  return (
    <>
      <div class="profile">
        <div class="profile__art">
          {artwork && <img src={artwork} alt={name} width="475" height="475" />}
        </div>
        <div class="profile__info">
          <p class="muted">{dexNumber(species.id)}</p>
          <h1>{name}</h1>
          {genus && <p class="muted">{genus}</p>}
          <p class="badges">
            {[...pokemon.types]
              .sort((a, b) => a.slot - b.slot)
              .map((t) => (
                <TypeBadge name={t.type.name} label={typeLabels.get(t.type.name) ?? humanize(t.type.name)} />
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
            {pokemon.stats.map((s) => (
              <StatRow label={STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)} value={s.base_stat} max={MAX_STAT} />
            ))}
            <StatRow label="Total" value={total} max={MAX_STAT * pokemon.stats.length} total />
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-list">
          {abilities.map((a) => (
            <li>
              <a href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</a>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {chain ? (
          <EvolutionTree links={[chain.chain]} />
        ) : (
          <EvolutionTree links={[{ species: { name: species.name, url: '' }, evolves_to: [] }]} />
        )}
      </Section>

      <Section id="moves" title="Moves">
        <MovesBody pokemon={pokemon} speciesName={species.name} game={game} />
      </Section>
    </>
  );
};

const StatRow: FC<{ label: string; value: number; max: number; total?: boolean }> = ({ label, value, max, total }) => (
  <tr class={total ? 'stats__total' : ''}>
    <th scope="row">{label}</th>
    <td class="stats__value">{value}</td>
    <td class="stats__bar" aria-hidden="true">
      <span class="bar">
        <span class="bar__fill" style={`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`}></span>
      </span>
    </td>
  </tr>
);

const EvolutionTree: FC<{ links: ChainLink[] }> = ({ links }) => (
  <ul class="evolution">
    {links.map((l) => (
      <li>
        <a href={`/pokemon/${l.species.name}`}>{humanize(l.species.name)}</a>
        {l.evolves_to.length > 0 && <EvolutionTree links={l.evolves_to} />}
      </li>
    ))}
  </ul>
);

// ---------------------------------------------------------------------------------------
// Moves

type MoveRow = { level: number | null; move: Move };

export const MovesBody: FC<{ pokemon: Pokemon; speciesName: string; game: string | null }> = async ({
  pokemon,
  speciesName,
  game,
}) => {
  const groupNames = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const groups = (await mapAll(groupNames, (n) => getVersionGroup(n)))
    .filter((g) => g != null)
    .sort((a, b) => a.order - b.order);
  if (!groups.length) return <p>No moves.</p>;

  const selected = groups.find((g) => g.name === game)?.name ?? groups[groups.length - 1].name;

  // learn method -> rows
  const byMethod = new Map<string, { name: string; level: number | null }[]>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue;
      const method = d.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, []);
      const rows = byMethod.get(method)!;
      const level = method === 'level-up' ? d.level_learned_at : null;
      if (!rows.some((r) => r.name === m.move.name && r.level === level)) rows.push({ name: m.move.name, level });
    }
  }
  const moveNames = [...new Set([...byMethod.values()].flat().map((r) => r.name))];
  const [moves, typeLabels] = await Promise.all([
    mapAll(moveNames, async (n) => [n, await getMove(n)] as const),
    getTypeLabels(),
  ]);
  const moveMap = new Map(moves.filter((m): m is readonly [string, Move] => m[1] != null));

  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  const methods = [...byMethod.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  return (
    <div id="moves-body">
      <form
        class="game-picker"
        method="get"
        action={`/pokemon/${speciesName}#moves`}
        hx-get={`/pokemon/${speciesName}/moves`}
        hx-trigger="change"
        hx-target="#moves-body"
        hx-swap="outerHTML"
        hx-sync="this:replace"
      >
        <label for="game">Game</label>
        <select id="game" name="game">
          {groups.map((g) => (
            <option value={g.name} selected={g.name === selected}>
              {humanize(g.name)}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit">Show</button>
        </noscript>
      </form>
      {methods.map((method) => {
        const rows: MoveRow[] = byMethod
          .get(method)!
          .flatMap((r) => (moveMap.has(r.name) ? [{ level: r.level, move: moveMap.get(r.name)! }] : []));
        if (!rows.length) return null;
        const isLevel = method === 'level-up';
        rows.sort(
          (a, b) => (isLevel ? (a.level ?? 0) - (b.level ?? 0) : 0) || englishName(a.move).localeCompare(englishName(b.move)),
        );
        return (
          <MoveTable caption={humanize(method)} rows={rows} withLevel={isLevel} typeLabels={typeLabels} />
        );
      })}
    </div>
  );
};

const SortHeader: FC<{ label: string; type: 'text' | 'number' }> = ({ label, type }) => (
  <th scope="col" data-sort-type={type}>
    <button type="button" class="sort-button">
      {label}
    </button>
  </th>
);

const MoveTable: FC<{ caption: string; rows: MoveRow[]; withLevel: boolean; typeLabels: Map<string, string> }> = ({
  caption,
  rows,
  withLevel,
  typeLabels,
}) => (
  <div class="table-scroll">
    <table class="moves sortable">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {withLevel && <SortHeader label="Level" type="number" />}
          <SortHeader label="Move" type="text" />
          <SortHeader label="Type" type="text" />
          <SortHeader label="Category" type="text" />
          <SortHeader label="Power" type="number" />
          <SortHeader label="Accuracy" type="number" />
          <SortHeader label="PP" type="number" />
        </tr>
      </thead>
      <tbody>
        {rows.map(({ level, move }) => {
          const name = englishName(move);
          const typeLabel = typeLabels.get(move.type.name) ?? humanize(move.type.name);
          const category = move.damage_class ? humanize(move.damage_class.name) : null;
          return (
            <tr>
              {withLevel && <td data-sort={level ?? ''}>{dash(level)}</td>}
              <td data-sort={name}>
                <a href={`/moves/${move.name}`}>{name}</a>
              </td>
              <td data-sort={typeLabel}>
                <TypeBadge name={move.type.name} label={typeLabel} />
              </td>
              <td data-sort={category ?? ''}>{dash(category)}</td>
              <td data-sort={move.power ?? ''}>{dash(move.power)}</td>
              <td data-sort={move.accuracy ?? ''}>{dash(move.accuracy)}</td>
              <td data-sort={move.pp ?? ''}>{dash(move.pp)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
