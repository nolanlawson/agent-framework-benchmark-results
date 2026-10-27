import Link from 'next/link';
import { dexNumber, humanize } from '@/lib/format';
import { TypeBadge } from './TypeBadge';

export interface PokemonCardProps {
  id: number;
  name: string;
  spriteBase: string;
  types?: { name: string; label: string }[];
  hidden?: boolean;
}

export function PokemonCard({ id, name, spriteBase, types, hidden }: PokemonCardProps) {
  return (
    <Link href={`/pokemon/${name}`} className="card">
      <img
        className="card-sprite"
        src={`${spriteBase}/media/sprites/pokemon/${id}.png`}
        alt=""
        width={96}
        height={96}
        decoding="async"
      />
      <span className="card-number">{dexNumber(id)}</span>
      <span className="card-name">{humanize(name)}</span>
      {types && types.length > 0 && (
        <span className="card-types">
          {types.map((t) => (
            <TypeBadge key={t.name} type={t.name} label={t.label} link={false} />
          ))}
        </span>
      )}
      {hidden && <span className="card-note">Hidden ability</span>}
    </Link>
  );
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <ul className="card-grid">{children}</ul>;
}
