import { collapseWhitespace, dexNumber, englishName, humanize, idFromUrl, isDefaultForm, latestEnglishFlavorText, orMissing } from './format';

const lang = (name: string) => ({ name, url: '' });

describe('format', () => {
  it('humanizes API names', () => {
    expect(humanize('mr-mime')).toBe('Mr Mime');
    expect(humanize('thunder-punch')).toBe('Thunder Punch');
    expect(humanize('pikachu')).toBe('Pikachu');
  });

  it('formats dex numbers', () => {
    expect(dexNumber(25)).toBe('#0025');
    expect(dexNumber(1026)).toBe('#1026');
  });

  it('picks the English name, falling back to the humanized API name', () => {
    expect(englishName([{ name: 'M. Mime', language: lang('fr') }, { name: 'Mr. Mime', language: lang('en') }], 'mr-mime')).toBe('Mr. Mime');
    expect(englishName([], 'mr-mime')).toBe('Mr Mime');
  });

  it('uses the last English flavor text with whitespace collapsed', () => {
    const entries = [
      { flavor_text: 'First\none.', language: lang('en') },
      { flavor_text: 'Second\fone,\n  latest.', language: lang('en') },
      { flavor_text: 'Dernier.', language: lang('fr') },
    ];
    expect(latestEnglishFlavorText(entries)).toBe('Second one, latest.');
    expect(latestEnglishFlavorText([])).toBeNull();
    expect(collapseWhitespace('  a \n\n b ')).toBe('a b');
  });

  it('reads IDs from resource URLs and spots alternate forms', () => {
    expect(idFromUrl('http://localhost:9000/api/v2/pokemon/386/')).toBe(386);
    expect(isDefaultForm({ name: 'deoxys-normal', url: '/api/v2/pokemon/386/' })).toBe(true);
    expect(isDefaultForm({ name: 'deoxys-attack', url: '/api/v2/pokemon/10001/' })).toBe(false);
  });

  it('shows missing values as an em dash', () => {
    expect(orMissing(null)).toBe('—');
    expect(orMissing(0)).toBe('0');
    expect(orMissing(90)).toBe('90');
  });
});
