import { addDays, type Household, type IsoDate, type StockItem } from '@egenberedskap/core';

import { todayIso } from './format';

// Stand-in until the local store exists. Mirrors the household in the iOS design, with
// dates relative to today so the screens look the same whichever day the app is opened.

const today = todayIso();
const inDays = (days: number): IsoDate => addDays(today, days);

export const user = { name: 'Kari Nordmann', firstName: 'Kari' };

export const properties = [
  { id: 'home', name: 'Storgata 12', short: 'Hjemme' },
  { id: 'cabin', name: 'Hafjell', short: 'Hytta' },
];

export const household: Household = { id: 'home', people: 2 };

export const lastQuarterlyCheck: IsoDate = inDays(-82);

export const stock: StockItem[] = [
  { id: 'w1', name: '6 liter vann', category: 'water', litres: 6, expiresOn: inDays(1) },
  { id: 'w2', name: 'Vanndunk, 24 l', category: 'water', litres: 24 },
  { id: 'f1', name: 'Knekkebrød', category: 'food', personDays: 4, expiresOn: inDays(13) },
  { id: 'f2', name: 'Hermetikk og tørrmat', category: 'food', personDays: 10 },
  { id: 'l1', name: 'Lommelykt, lys og fyrstikker', category: 'heatAndLight' },
  { id: 'a1', name: 'Førstehjelpsskrin', category: 'firstAid' },
  { id: 'c1', name: 'Kontanter', category: 'hygieneAndCash' },
];

export type Room = { id: string; name: string; items: number; value: number; filmed: boolean };

export const rooms: Room[] = [
  { id: 'stue', name: 'Stue', items: 31, value: 92_300, filmed: true },
  { id: 'kjokken', name: 'Kjøkken', items: 24, value: 61_800, filmed: true },
  { id: 'gang', name: 'Gang', items: 9, value: 32_300, filmed: true },
  { id: 'soverom', name: 'Soverom', items: 0, value: 0, filmed: false },
  { id: 'bod', name: 'Bod', items: 0, value: 0, filmed: false },
];

export const trips = [
  { id: 'lisboa', name: 'Lisboa', when: '5.–12. oktober', items: 0, value: 0, upcoming: true },
  { id: 'tromso', name: 'Tromsø', when: 'Mars', items: 14, value: 31_200, upcoming: false },
  { id: 'kreta', name: 'Kreta', when: 'Juli 2025', items: 19, value: 38_900, upcoming: false },
];

export const emergencyNumbers = [
  { number: '110', label: 'Brann', urgent: true },
  { number: '112', label: 'Politi', urgent: true },
  { number: '113', label: 'Ambulanse', urgent: true },
  { number: '116117', display: '116 117', label: 'Legevakt', urgent: false },
];

export const contacts = [
  { id: 'ola', name: 'Ola Nordmann', relation: 'Partner', phone: '+4790000000' },
  { id: 'eva', name: 'Eva Hansen', relation: 'Nabo, har reservenøkkel', phone: '+4790000001' },
];

export const meetingPlace = { name: 'Skolegården', address: 'Storgata 40' };

export const documents = [
  { id: 'pass', name: 'Pass, Kari og Ola', files: 2 },
  { id: 'resepter', name: 'Resepter og medisinliste', files: 1 },
  { id: 'skjote', name: 'Skjøte, Storgata 12', files: 1 },
];

export const policies = [
  { id: 'innbo', name: 'Innbo, Storgata 12', renews: '1. jan', sum: 1_000_000, deductible: 4_000 },
  { id: 'hus', name: 'Hus, Storgata 12', renews: '1. jan', deductible: 8_000 },
  { id: 'hytte', name: 'Hytte, Hafjell', renews: '15. nov', deductible: 8_000 },
  { id: 'reise', name: 'Reise, familie', renews: '1. mar', deductible: 1_000 },
];
