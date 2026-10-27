import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, apiOrNull, getTypeLabels } from '@/lib/api';
import { dexNumber, englishName, humanize, latestEnglishFlavorText, MISSING } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadges } from '@/components/TypeBadge';
import { MovesSection, type Game, type Learn, type MoveInfo } from './MovesSection';

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

async function getSpecies(name: string) {
  const species = await apiOrNull(`pokemon-species/${encodeURIComponent(decodeURIComponent(name).toLowerCase())}`);
  if (!species) notFound();
  return species;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const species = await getSpecies((await params).name);
  return { title: englishName(species.names) ?? humanize(species.name) };
}

function StatBar({ fraction }: { fraction: number }) {
  return (
    <span className="stat-track">
      <span className="stat-fill" style={{ width: `${Math.min(100, fraction * 100)}%` }} />
    </span>
  );
}

type ChainLink = { species: { name: string }; evolves_to: ChainLink[] };

function EvolutionTree({ links }: { links: ChainLink[] }) {
  return (
    <ul>
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

async function getMoves(pokemon: any) {
  const learns: Learn[] = [];
  const versionGroups = new Map<string, string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      learns.push([m.move.name, d.version_group.name, d.move_learn_method.name, d.level_learned_at]);
      versionGroups.set(d.version_group.name, d.version_group.url);
    }
  }

  const [typeLabels, moveRecords, groupRecords] = await Promise.all([
    getTypeLabels(),
    Promise.all(pokemon.moves.map((m: any) => api(m.move.url))),
    Promise.all([...versionGroups.values()].map((url) => api(url))),
  ]);

  const moves: Record<string, MoveInfo> = {};
  for (const move of moveRecords) {
    moves[move.name] = {
      label: englishName(move.names) ?? humanize(move.name),
      type: move.type.name,
      typeLabel: typeLabels.get(move.type.name) ?? humanize(move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
  }
  const games: Game[] = groupRecords
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ name: g.name, label: humanize(g.name) }));
  return { learns, moves, games };
}

export default async function PokemonPage({ params, searchParams }: Props) {
  const species = await getSpecies((await params).name);
  const [pokemon, chain, typeLabels] = await Promise.all([
    api(`pokemon/${species.id}`),
    species.evolution_chain?.url ? api(species.evolution_chain.url) : null,
    getTypeLabels(),
  ]);
  const { learns, moves, games } = await getMoves(pokemon);

  const name = englishName(species.names) ?? humanize(species.name);
  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus;
  const flavor = latestEnglishFlavorText(species.flavor_text_entries);
  const artwork: string | null =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;
  const types = [...pokemon.types]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({ name: t.type.name, label: typeLabels.get(t.type.name) ?? humanize(t.type.name) }));
  const stats = pokemon.stats.map((s: any) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat }));
  const total = stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0);
  const abilities = [...pokemon.abilities].sort((a: any, b: any) => a.slot - b.slot);

  const requested = (await searchParams).game;
  const requestedGame = Array.isArray(requested) ? requested[0] : requested;

  return (
    <>
      <div className="hero">
        <div className="artwork">
          {artwork && <img src={artwork} alt={name} width={256} height={256} fetchPriority="high" />}
        </div>
        <div className="hero-info">
          <p className="hero-dex">{dexNumber(species.id)}</p>
          <h1>{name}</h1>
          {genus && <p className="genus">{genus}</p>}
          <TypeBadges types={types} link />
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <p className="flavor">{flavor ?? MISSING}</p>
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {stats.map((s: { label: string; value: number }) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar" aria-hidden="true">
                  <StatBar fraction={s.value / MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td className="stat-bar" aria-hidden="true">
                <StatBar fraction={total / (MAX_STAT * Math.max(1, stats.length))} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="bullets">
          {abilities.map((a: any) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`} prefetch={false}>
                {humanize(a.ability.name)}
              </Link>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution" className="evolution">
        {chain ? (
          <EvolutionTree links={[chain.chain]} />
        ) : (
          <ul>
            <li>
              <Link href={`/pokemon/${species.name}`}>{humanize(species.name)}</Link>
            </li>
          </ul>
        )}
      </Section>

      <MovesSection games={games} moves={moves} learns={learns} initialGame={requestedGame} />
    </>
  );
}
