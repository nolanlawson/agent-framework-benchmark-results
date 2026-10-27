import { API_BASE_URL, englishName, getGenerations, getPokemonIndex, getTypes } from '@/lib/api';
import { PokemonBrowser } from '@/components/PokemonBrowser';

export default async function HomePage() {
  const [index, types, generations] = await Promise.all([getPokemonIndex(), getTypes(), getGenerations()]);
  return (
    <>
      <h1 className="page-title">Pokémon</h1>
      <PokemonBrowser
        index={index}
        types={types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) }))}
        generations={generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) }))}
        spriteBase={API_BASE_URL}
      />
    </>
  );
}
