import { filterSpecies, HomeData } from './home-data';

const data: HomeData = {
  species: [
    { id: 1, name: 'bulbasaur' },
    { id: 4, name: 'charmander' },
    { id: 122, name: 'mr-mime' },
    { id: 390, name: 'chimchar' },
  ],
  types: [],
  generations: [],
  typesBySpecies: new Map([
    [1, [{ name: 'grass', label: 'Grass' }, { name: 'poison', label: 'Poison' }]],
    [4, [{ name: 'fire', label: 'Fire' }]],
    [122, [{ name: 'psychic', label: 'Psychic' }, { name: 'fairy', label: 'Fairy' }]],
    [390, [{ name: 'fire', label: 'Fire' }]],
  ]),
  generationBySpecies: new Map([
    [1, 'generation-i'],
    [4, 'generation-i'],
    [122, 'generation-i'],
    [390, 'generation-iv'],
  ]),
};

const names = (q = '', type = '', generation = '') => filterSpecies(data, { q, type, generation }).map((s) => s.name);

describe('filterSpecies', () => {
  it('returns everything without filters', () => {
    expect(names()).toEqual(['bulbasaur', 'charmander', 'mr-mime', 'chimchar']);
  });

  it('searches humanized names case-insensitively', () => {
    expect(names('CHAR')).toEqual(['charmander', 'chimchar']);
    expect(names('mr mime')).toEqual(['mr-mime']);
  });

  it('matches a type in either slot', () => {
    expect(names('', 'poison')).toEqual(['bulbasaur']);
    expect(names('', 'fairy')).toEqual(['mr-mime']);
  });

  it('combines all filters', () => {
    expect(names('char', 'fire', 'generation-iv')).toEqual(['chimchar']);
  });
});
