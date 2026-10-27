import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameSelect } from "@/components/GameSelect";
import { MoveTable, type MoveRow } from "@/components/MoveTable";
import { Section } from "@/components/Section";
import { TypeBadge } from "@/components/TypeBadge";
import { find, get, type ChainLink, type EvolutionChain, type Move, type Pokemon, type Species, type VersionGroup } from "@/lib/api";
import { getTypeLabels, typeInfo } from "@/lib/data";
import { dexNumber, english, englishName, humanize, idFromUrl, isApiName, latestFlavorText } from "@/lib/format";

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};
const MAX_STAT = 255;

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

async function getSpecies(name: string) {
  return isApiName(name) ? find<Species>(`pokemon-species/${name.toLowerCase()}`) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const species = await getSpecies(name);
  return { title: species ? englishName(species.names, species.name) : "Not found" };
}

export default async function PokemonPage({ params, searchParams }: Props) {
  const { name } = await params;
  const species = await getSpecies(name);
  if (!species) notFound();

  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, typeLabels] = await Promise.all([
    get<Pokemon>(`pokemon/${defaultVariety ? idFromUrl(defaultVariety.url) : species.id}`),
    species.evolution_chain ? find<EvolutionChain>(species.evolution_chain.url) : null,
    getTypeLabels(),
  ]);

  const displayName = englishName(species.names, species.name);
  const genus = english(species.genera)?.genus;
  const flavorText = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default;
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeInfo(typeLabels, t.type.name));
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  const game = (await searchParams).game;
  const moves = await getMoves(pokemon, typeof game === "string" ? game : undefined, typeLabels);

  return (
    <>
      <div className="summary">
        <div className="summary__art">
          {artwork && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt={displayName} width={256} height={256} />
          )}
        </div>
        <div className="summary__info">
          <p className="summary__number">{dexNumber(species.id)}</p>
          <h1 className="summary__name">{displayName}</h1>
          {genus && <p className="summary__genus">{genus}</p>}
          <p className="type-list">
            {types.map((t) => (
              <TypeBadge key={t.name} type={t} size="md" />
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavorText && <p className="summary__flavor">{flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {pokemon.stats.map((s) => (
              <tr key={s.stat.name}>
                <th scope="row">{STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
                <td className="stats__value">{s.base_stat}</td>
                <td className="stats__bar" aria-hidden="true">
                  <StatBar value={s.base_stat} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr className="stats__total">
              <th scope="row">Total</th>
              <td className="stats__value">{total}</td>
              <td className="stats__bar" aria-hidden="true">
                <StatBar value={total} max={MAX_STAT * Math.max(1, pokemon.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`} prefetch={false}>
                {humanize(a.ability.name)}
              </Link>
              {a.is_hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        {chain ? (
          <EvolutionTree links={[chain.chain]} />
        ) : (
          <EvolutionTree links={[{ species: { name: species.name, url: "" }, evolves_to: [] }]} />
        )}
      </Section>

      <Section title="Moves" id="moves">
        {moves.games.length === 0 ? (
          <p>No moves.</p>
        ) : (
          <>
            <GameSelect value={moves.selected} options={moves.games} />
            {moves.tables.map((table) => (
              <MoveTable key={`${moves.selected}-${table.method}`} caption={table.label} rows={table.rows} showLevel={table.method === "level-up"} />
            ))}
          </>
        )}
      </Section>
    </>
  );
}

function StatBar({ value, max }: { value: number; max: number }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <span className="stat-bar">
      <span className="stat-bar__fill" style={{ width: `${percent}%` }} />
    </span>
  );
}

function EvolutionTree({ links }: { links: ChainLink[] }) {
  return (
    <ul className="evolution">
      {links.map((link) => (
        <li key={link.species.name}>
          <Link href={`/pokemon/${link.species.name}`} prefetch={false}>
            {humanize(link.species.name)}
          </Link>
          {link.evolves_to.length > 0 && <EvolutionTree links={link.evolves_to} />}
        </li>
      ))}
    </ul>
  );
}

async function getMoves(pokemon: Pokemon, requestedGame: string | undefined, typeLabels: Map<string, string>) {
  const gameNames = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) gameNames.add(d.version_group.name);

  const groups = await Promise.all([...gameNames].map((g) => get<VersionGroup>(`version-group/${g}`)));
  groups.sort((a, b) => a.order - b.order || a.id - b.id);
  const games = groups.map((g) => ({ name: g.name, label: humanize(g.name) }));
  const selected = games.some((g) => g.name === requestedGame) ? requestedGame! : (games.at(-1)?.name ?? "");

  const learned: { move: string; method: string; level: number }[] = [];
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name === selected) {
        learned.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
      }
    }
  }

  const details = new Map<string, Move>();
  await Promise.all(
    [...new Set(learned.map((l) => l.move))].map(async (name) => {
      const move = await find<Move>(`move/${name}`);
      if (move) details.set(name, move);
    }),
  );

  const byMethod = new Map<string, MoveRow[]>();
  const seen = new Set<string>();
  for (const l of learned) {
    const move = details.get(l.move);
    if (!move) continue;
    const key = `${l.method}:${l.move}:${l.method === "level-up" ? l.level : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rows = byMethod.get(l.method) ?? [];
    rows.push({
      key,
      level: l.method === "level-up" ? l.level : undefined,
      name: move.name,
      label: englishName(move.names, move.name),
      type: typeInfo(typeLabels, move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    });
    byMethod.set(l.method, rows);
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  const tables = [...byMethod]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));

  return { games, selected, tables };
}
