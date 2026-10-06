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
  it('names a single item and opens it directly', () => {
    expect(
      reminderMessage({ kind: 'expiring', on: '2026-10-18', expiresOn: '2026-11-01', items: [item('a b', '6 liter vann')] }),
    ).toEqual({
      title: 'Går ut om 1 uke',
      body: '6 liter vann går ut 1. november. Bytt det ut, så teller det fortsatt.',
      url: '/lager/vare/a%20b',
    });
  });

  it('lists several items and opens the stockpile', () => {
    const message = reminderMessage({
      kind: 'expiring',
      on: '2026-10-18',
      expiresOn: '2026-11-01',
      items: [item('a', 'Vann'), item('b', 'Knekkebrød'), item('c', 'Hermetikk')],
    });
    expect(message.title).toBe('3 varer går ut om 1 uke');
    expect(message.body).toBe('Vann, Knekkebrød og Hermetikk går ut 1. november.');
    expect(message.url).toBe('/lager');
  });

  it('shortens a long list', () => {
    const items = ['A', 'B', 'C', 'D', 'E'].map((name) => item(name, name));
    expect(reminderMessage({ kind: 'expiring', on: '2026-10-18', expiresOn: '2026-11-01', items }).body).toBe(
      'A, B og 3 til går ut 1. november.',
    );
  });

  it('opens the quarterly check and the stockpile review where they belong', () => {
    expect(reminderMessage({ kind: 'quarterlyCheck', on: '2026-10-09' }).url).toBe('/kvartalssjekk');
    expect(reminderMessage({ kind: 'expiryReview', on: '2026-10-09' }).url).toBe('/lager');
  });
});
