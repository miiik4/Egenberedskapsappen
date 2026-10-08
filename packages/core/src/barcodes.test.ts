import { describe, expect, it } from 'vitest';
import { lookupBarcode } from './barcodes';

describe('lookupBarcode', () => {
  it('identifies common Norwegian grocery and pantry items', () => {
    const mackerel = lookupBarcode('7039010010155');
    expect(mackerel).toBeDefined();
    expect(mackerel?.name).toContain('Makrell i tomat');
    expect(mackerel?.type).toBe('cannedMeals');

    const oats = lookupBarcode('7032110000010');
    expect(oats).toBeDefined();
    expect(oats?.name).toContain('Havregryn');
    expect(oats?.type).toBe('oats');

    const crispbread = lookupBarcode('7300400117402');
    expect(crispbread).toBeDefined();
    expect(crispbread?.name).toContain('Wasa Husman');
    expect(crispbread?.type).toBe('crispbread');
  });

  it('identifies water bottles with volume', () => {
    const imsdal = lookupBarcode('7044411000120');
    expect(imsdal).toBeDefined();
    expect(imsdal?.name).toContain('Imsdal');
    expect(imsdal?.type).toBe('drinkingWater');
    expect(imsdal?.litres).toBe(1.5);
  });

  it('identifies non-food preparedness items like iodine and batteries', () => {
    const iodine = lookupBarcode('7046260714771');
    expect(iodine?.type).toBe('iodine');

    const batteries = lookupBarcode('5000394077028');
    expect(batteries?.type).toBe('batteries');

    const matches = lookupBarcode('7020611000018');
    expect(matches?.type).toBe('matches');
  });

  it('handles spaces and dashes in raw input', () => {
    const clean = lookupBarcode(' 7039-0100-10155 ');
    expect(clean?.name).toContain('Makrell i tomat');
  });

  it('handles 12-digit UPC and 13-digit EAN zero-prefix equivalence', () => {
    // 0848061000013 vs 848061000013
    const upc = lookupBarcode('848061000013');
    expect(upc?.type).toBe('powerBank');

    const ean = lookupBarcode('0848061000013');
    expect(ean?.type).toBe('powerBank');
  });

  it('returns undefined for unknown barcodes or empty input', () => {
    expect(lookupBarcode('')).toBeUndefined();
    expect(lookupBarcode('1234567890123')).toBeUndefined();
  });
});
