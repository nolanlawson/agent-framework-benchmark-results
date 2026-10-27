import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import {
  getDefaultPokemon,
  getEvolutionChain,
  getMove,
  getSpecies,
  getTypeLabels,
  getVersionGroupOrders,
  type ChainLink,
} from '@/lib/api';
import { dexNumber, englishName, humanize, latestEnglishFlavor } from '@/lib/format';
import { MovesSection, type LearnedMove, type MoveInfo } from './MovesSection';

type Props = { params: Promise<{ name: string }>; searchParams: Promise<{ game?: string | string[] }> };

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

async function load(name: string) {
  const species = await getSpecies(decodeURIComponent(name));
  if (!species) notFound();
  return species;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const species = await load((await params).name);
  return { title: englishName(species.names) ?? humanize(species.name) };
}

function EvolutionTree({ links }: { links: ChainLink[] }) {
  return (
    <ul className="evolution">
      {links.map((link) => (
        <li key={link.species.name}>
          <Link href={`/pokemon/${link.species.name}`}>{humanize(link.species.name)}</Link>
          {link.evolves_to.length > 0 && <EvolutionTree links={link.evolves_to} />}
        </li>
      ))}
    </ul>
  );
}

export default async function PokemonPage({ params, searchParams }: Props) {
  const [{ name }, { game }] = await Promise.all([params, searchParams]);
  const species = await load(name);
  const [pokemon, chain, typeLabels] = await Promise.all([
    getDefaultPokemon(species),
    getEvolutionChain(species),
    getTypeLabels(),
  ]);
  if (!pokemon) notFound();

  const title = englishName(species.names) ?? humanize(species.name);
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot);
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const typeLabel = (t: string) => typeLabels.get(t) ?? humanize(t);

  // Moves: every move the Pokémon learns, with the details the tables need.
  const [moveRecords, versionOrders] = await Promise.all([
    Promise.all(pokemon.moves.map((m) => getMove(m.move.name))),
    getVersionGroupOrders([
      ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
    ]),
  ]);
  const moves: Record<string, MoveInfo> = {};
  for (const move of moveRecords) {
    if (!move) continue;
    moves[move.name] = {
      label: englishName(move.names) ?? humanize(move.name),
      type: move.type.name,
      typeLabel: typeLabel(move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
  }
  const learnsets: Record<string, LearnedMove[]> = {};
  for (const m of pokemon.moves) {
    if (!moves[m.move.name]) continue;
    for (const d of m.version_group_details) {
      const list = (learnsets[d.version_group.name] ??= []);
      const entry = { move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at };
      if (!list.some((e) => e.move === entry.move && e.method === entry.method && e.level === entry.level)) {
        list.push(entry);
      }
    }
  }
  const games = Object.keys(learnsets)
    .sort((a, b) => (versionOrders.get(a) ?? 0) - (versionOrders.get(b) ?? 0))
    .map((g) => ({ name: g, label: humanize(g) }));
  const requested = Array.isArray(game) ? game[0] : game;

  return (
    <>
      <div className="hero">
        <div className="artwork">
          {artwork && <img src={artwork} alt={title} width={475} height={475} />}
        </div>
        <div className="hero-info">
          <p className="dex-number">{dexNumber(species.id)}</p>
          <h1>{title}</h1>
          {genus && <p className="genus">{genus}</p>}
          <ul className="type-list">
            {types.map((t) => (
              <li key={t.type.name}>
                <TypeBadge name={t.type.name} label={typeLabel(t.type.name)} link small />
              </li>
            ))}
          </ul>
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
          {flavor && <p className="flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {pokemon.stats.map((s) => (
              <tr key={s.stat.name}>
                <th scope="row">{STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
                <td>{s.base_stat}</td>
                <td className="stat-bar-cell" aria-hidden="true">
                  <span className="stat-bar">
                    <span style={{ width: `${Math.min(100, (s.base_stat / MAX_STAT) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stats-total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td className="stat-bar-cell" aria-hidden="true">
                <span className="stat-bar">
                  <span
                    style={{ width: `${Math.min(100, (total / (MAX_STAT * Math.max(1, pokemon.stats.length))) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="bullet-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden && <Fragment> (hidden)</Fragment>}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {chain ? (
          <EvolutionTree links={[chain]} />
        ) : (
          <ul className="evolution">
            <li>
              <Link href={`/pokemon/${species.name}`}>{humanize(species.name)}</Link>
            </li>
          </ul>
        )}
      </Section>

      <MovesSection key={species.name} games={games} initialGame={requested} moves={moves} learnsets={learnsets} />
    </>
  );
}
