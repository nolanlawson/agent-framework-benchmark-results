import { collapseWhitespace, dexNumber, englishName, humanize, idFromUrl, latestEnglishFlavorText, mapLimit } from './format';

const en = { name: 'en', url: '' };
const fr = { name: 'fr', url: '' };

describe('format helpers', () => {
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
    expect(englishName([{ name: 'M. Mime', language: fr }, { name: 'Mr. Mime', language: en }], 'mr-mime')).toBe('Mr. Mime');
    expect(englishName([], 'mr-mime')).toBe('Mr Mime');
  });

  it('uses the last English flavor text with whitespace collapsed', () => {
    const entries = [
      { flavor_text: 'Old\ntext', language: en },
      { flavor_text: 'New\ftext\n here', language: en },
      { flavor_text: 'Texte', language: fr },
    ];
    expect(latestEnglishFlavorText(entries)).toBe('New text here');
    expect(latestEnglishFlavorText([])).toBeNull();
    expect(collapseWhitespace('  a \n b ')).toBe('a b');
  });

  it('reads IDs from API URLs', () => {
    expect(idFromUrl('http://localhost:9000/api/v2/pokemon/10001/')).toBe(10001);
    expect(idFromUrl('/api/v2/pokemon-species/25')).toBe(25);
  });

  it('maps with limited concurrency, preserving order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const result = await mapLimit([5, 1, 3, 2, 4], 2, async (n) => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise((r) => setTimeout(r, n));
      inFlight--;
      return n * 10;
    });
    expect(result).toEqual([50, 10, 30, 20, 40]);
    expect(maxInFlight).toBe(2);
  });
});
