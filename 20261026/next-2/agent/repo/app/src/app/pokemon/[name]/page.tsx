import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  englishName,
  getEvolutionChain,
  getMoveSummary,
  getPokemon,
  getSpecies,
  getTypeNames,
  getVersionGroupOrder,
  latestEnglishFlavorText,
  mapLimit,
  type ChainLink,
  type MoveSummary,
} from '@/lib/api';
import { dexNumber, humanize } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { MovesSection, type GameOption, type LearnedMove } from '@/components/MovesSection';

type Props = { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const species = await getSpecies((await params).name);
  if (!species) return { title: 'Not found' };
  return { title: englishName(species.names, humanize(species.name)) };
}

function EvolutionTree({ link }: { link: ChainLink }) {
  return (
    <li>
      <Link href={`/pokemon/${link.species.name}`}>{humanize(link.species.name)}</Link>
      {link.evolves_to.length > 0 && (
        <ul>
          {link.evolves_to.map((child) => (
            <EvolutionTree key={child.species.name} link={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function PokemonPage({ params, searchParams }: Props) {
  const { name } = await params;
  const species = await getSpecies(name);
  if (!species) notFound();
  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
  const [pokemon, chain, typeNames, versionOrder] = await Promise.all([
    getPokemon(species.id),
    species.evolution_chain ? getEvolutionChain(species.evolution_chain.url) : null,
    getTypeNames(),
    getVersionGroupOrder(),
  ]);
  const resolved = pokemon ?? (defaultVariety ? await getPokemon(defaultVariety.name) : null);
  if (!resolved) notFound();

  const displayName = englishName(species.names, humanize(species.name));
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const flavor = latestEnglishFlavorText(species.flavor_text_entries);
  const artwork = resolved.sprites.other?.['official-artwork']?.front_default ?? resolved.sprites.front_default;
  const types = [...resolved.types].sort((a, b) => a.slot - b.slot);
  const abilities = [...resolved.abilities].sort((a, b) => a.slot - b.slot);
  const total = resolved.stats.reduce((sum, s) => sum + s.base_stat, 0);

  // Moves: every (move, version group, method) the Pokémon learns, with move details.
  const moveNames = resolved.moves.map((m) => m.move.name);
  const summaries = await mapLimit(moveNames, 16, (n) => getMoveSummary(n));
  const summaryByName = new Map<string, MoveSummary>();
  summaries.forEach((s) => s && summaryByName.set(s.name, s));

  const learned: Record<string, LearnedMove[]> = {};
  for (const entry of resolved.moves) {
    if (!summaryByName.has(entry.move.name)) continue;
    for (const detail of entry.version_group_details) {
      (learned[detail.version_group.name] ??= []).push([detail.move_learn_method.name, detail.level_learned_at, entry.move.name]);
    }
  }
  const games = new Set(Object.keys(learned));
  const gameOptions: GameOption[] = [...games]
    .sort((a, b) => (versionOrder[a] ?? Infinity) - (versionOrder[b] ?? Infinity) || a.localeCompare(b))
    .map((g) => ({ name: g, label: humanize(g) }));
  const requestedGame = (await searchParams).game;
  const initialGame =
    typeof requestedGame === 'string' && games.has(requestedGame) ? requestedGame : (gameOptions[gameOptions.length - 1]?.name ?? '');

  return (
    <>
      <div className="pokemon-summary">
        <div className="artwork">
          {artwork && <img src={artwork} alt={displayName} width={288} height={288} />}
        </div>
        <div className="summary-body">
          <p className="dex-number">{dexNumber(species.id)}</p>
          <h1 className="page-title">{displayName}</h1>
          {genus && <p className="genus">{genus}</p>}
          <p className="type-list">
            {types.map((t) => (
              <TypeBadge key={t.type.name} type={t.type.name} label={typeNames[t.type.name] ?? humanize(t.type.name)} />
            ))}
          </p>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{(resolved.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(resolved.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavor && <p className="flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {resolved.stats.map((s) => (
              <tr key={s.stat.name}>
                <th scope="row">{STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
                <td className="stat-value">{s.base_stat}</td>
                <td className="stat-bar-cell" aria-hidden="true">
                  <span className="stat-bar">
                    <span style={{ width: `${Math.min(100, (s.base_stat / MAX_STAT) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td className="stat-bar-cell" aria-hidden="true">
                <span className="stat-bar">
                  <span
                    style={{ width: `${Math.min(100, (total / (MAX_STAT * Math.max(1, resolved.stats.length))) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul className="evolution-tree">
          {chain ? (
            <EvolutionTree link={chain.chain} />
          ) : (
            <li>
              <Link href={`/pokemon/${species.name}`}>{humanize(species.name)}</Link>
            </li>
          )}
        </ul>
      </Section>

      <MovesSection
        games={gameOptions}
        initialGame={initialGame}
        learned={learned}
        moves={Object.fromEntries(summaryByName)}
        typeNames={typeNames}
      />
    </>
  );
}
