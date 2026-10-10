import type { StockItem } from '@egenberedskap/core';
import { describe, expect, it } from 'vitest';

import { reminderMessage } from './copy';

const item = (id: string, name: string): StockItem => ({
  id,
  name,
  type: 'drinkingWater',
  quantity: 1,
  litres: 6,
  expiresOn: '2026-11-01',
  remind: true,
  location: '',
});

describe('reminderMessage', () => {
  it('does not name a single item, but opens it directly', () => {
    expect(
      reminderMessage({ kind: 'expiring', on: '2026-10-18', expiresOn: '2026-11-01', items: [item('a b', 'Insulin')] }),
    ).toEqual({
      title: 'Noe på lageret går snart ut',
      body: 'Én vare går ut 1. november. Bytt den ut, så teller den fortsatt.',
      url: '/lager/vare/a%20b',
    });
  });

  it('counts several items without naming them and opens the stockpile', () => {
    const message = reminderMessage({
      kind: 'expiring',
      on: '2026-10-18',
      expiresOn: '2026-11-01',
      items: [item('a', 'Insulin'), item('b', 'Knekkebrød'), item('c', 'Hermetikk')],
    });
    expect(message).toEqual({
      title: '3 varer går snart ut',
      body: 'De går ut 1. november. Bytt dem ut, så teller de fortsatt.',
      url: '/lager',
    });
    expect(JSON.stringify(message)).not.toMatch(/Insulin|Knekkebrød|Hermetikk/);
  });

  it('opens the beredskapssjekk and the stockpile review where they belong', () => {
    const check = reminderMessage({ kind: 'check', on: '2026-10-09' });
    expect(check.title).toBe('Fremdeles beredt?');
    expect(check.url).toBe('/beredskapssjekk');
    expect(reminderMessage({ kind: 'expiryReview', on: '2026-10-09' }).url).toBe('/lager');
  });
});
