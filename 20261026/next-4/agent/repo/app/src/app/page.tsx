import { apiBase, getSpeciesIndex } from '@/lib/api';
import { PokemonBrowser } from './PokemonBrowser';

export default async function HomePage() {
  const { entries, types, generations } = await getSpeciesIndex();
  return (
    <>
      <h1>Pokémon</h1>
      <PokemonBrowser entries={entries} types={types} generations={generations} apiBase={apiBase()} />
    </>
  );
}
