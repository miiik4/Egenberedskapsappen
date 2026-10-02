import { addDays } from '@egenberedskap/core';
import type { AppData, Store } from '@egenberedskap/store';

import { todayIso } from './format';

/**
 * Development only: fills a fresh install with the household from the iOS design, with
 * dates relative to today, so every screen can be checked without typing it all in.
 */
export async function seedDemoData(actions: Omit<Store, 'load' | 'migrate'>, data: AppData) {
  const inDays = (days: number) => addDays(todayIso(), days);

  if (!data.onboarded) {
    await actions.completeOnboarding({ name: 'Kari', people: 2, address: 'Storgata 12' });
  }
  await actions.saveStockItem({ name: '6 liter vann', category: 'water', litres: 6, expiresOn: inDays(1) });
  await actions.saveStockItem({ name: 'Vanndunk, 24 l', category: 'water', litres: 24 });
  await actions.saveStockItem({ name: 'Knekkebrød', category: 'food', personDays: 4, expiresOn: inDays(13) });
  await actions.saveStockItem({ name: 'Hermetikk og tørrmat', category: 'food', personDays: 10 });
  await actions.saveStockItem({ name: 'Lommelykt, lys og fyrstikker', category: 'heatAndLight' });
  await actions.saveStockItem({ name: 'Førstehjelpsskrin', category: 'firstAid' });
  await actions.saveStockItem({ name: 'Kontanter', category: 'hygieneAndCash' });

  await actions.saveContact({ name: 'Ola Nordmann', relation: 'Partner', phone: '+47 900 00 000' });
  await actions.saveContact({ name: 'Eva Hansen', relation: 'Nabo, har reservenøkkel', phone: '+47 900 00 001' });
  await actions.setMeetingPlace({ name: 'Skolegården', address: 'Storgata 40' });

  await actions.savePolicy({ name: 'Innbo, Storgata 12', renewsOn: '2027-01-01', sumKr: 1_000_000, deductibleKr: 4_000 });
  await actions.savePolicy({ name: 'Hus, Storgata 12', renewsOn: '2027-01-01', deductibleKr: 8_000 });
  await actions.saveProperty({ name: 'Hafjell', shortName: 'Hytta' });
}
