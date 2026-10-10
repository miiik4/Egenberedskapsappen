import { addDays, type Belonging } from '@egenberedskap/core';
import type { Store } from '@egenberedskap/store';
import { File, Paths } from 'expo-file-system';

import { importFile } from '@/documents/files';

import { todayIso } from './format';

/**
 * Development only: fills a fresh install with the household from the iOS design, with
 * dates relative to today, so every screen can be checked without typing it all in. Also what
 * the website's screenshots are taken from: 4 days with food as the limit, water about to
 * expire, and more documented in the home than the sum insured.
 */
export async function seedDemoData(actions: Omit<Store, 'load' | 'migrate'>) {
  const inDays = (days: number) => addDays(todayIso(), days);

  const starter = await actions.completeOnboarding({
    members: { adults: 2, seniors: 0, children: 1, infants: 0, dogs: 1, cats: 0 },
    items: [],
    homeName: 'Storgata 12',
  });
  // A home of its own, since the starter rooms' ids aren't known here, so its rooms can be filled.
  const home = await actions.saveProperty({ name: 'Storgata 12', shortName: 'Storgata 12' });
  await actions.selectProperty(home);
  await actions.deleteProperty(starter);
  const room = (name: string) => actions.saveRoom({ propertyId: home, name });
  const [stue, kjokken, soverom, barnerom, gang, kontor] = [
    await room('Stue'),
    await room('Kjøkken'),
    await room('Soverom'),
    await room('Barnerom'),
    await room('Gang'),
    await room('Kontor'),
  ];
  await room('Bad');
  await room('Bod');
  const item = { quantity: 1, remind: true, location: '' };
  await actions.saveStockItem({
    ...item,
    name: 'Drikkevann',
    type: 'drinkingWater',
    litres: 70,
    boughtOn: addDays(inDays(9), -365),
    expiresOn: inDays(9),
    location: 'Bod',
  });
  await actions.saveStockItem({ ...item, name: 'Lapskaus', type: 'cannedMeals', quantity: 3, meals: 9, expiresOn: inDays(21) });
  await actions.saveStockItem({ ...item, name: 'Bønner i tomatsaus', type: 'cannedMeals', quantity: 4, meals: 8, expiresOn: '2028-03-01' });
  await actions.saveStockItem({ ...item, name: 'Tomatsuppe', type: 'cannedMeals', quantity: 4, meals: 8, expiresOn: '2027-06-01' });
  await actions.saveStockItem({ ...item, name: 'Makrell i tomat', type: 'cannedMeals', quantity: 2, meals: 3, expiresOn: '2028-05-01' });
  await actions.saveStockItem({ ...item, name: 'Knekkebrød', type: 'crispbread', quantity: 2, meals: 8, expiresOn: inDays(13) });
  await actions.saveStockItem({ ...item, name: 'Tørrfôr', type: 'petFood', remind: false });
  await actions.saveStockItem({ ...item, name: 'Vedovn og ved', type: 'heatSource' });
  await actions.saveStockItem({ ...item, name: 'Ullpledd', type: 'woolBlankets', quantity: 3 });
  await actions.saveStockItem({ ...item, name: 'Fyrstikker', type: 'matches' });
  await actions.saveStockItem({ ...item, name: 'Hodelykt', type: 'torch' });
  await actions.saveStockItem({ ...item, name: 'Stearinlys', type: 'candles', quantity: 10 });
  await actions.saveStockItem({ ...item, name: 'Powerbank', type: 'powerBank' });
  await actions.saveStockItem({ ...item, name: 'DAB-radio', type: 'radio' });
  await actions.saveStockItem({ ...item, name: 'Førstehjelpsskrin', type: 'firstAidKit' });
  await actions.saveStockItem({ ...item, name: 'Faste medisiner', type: 'medicines' });
  await actions.saveStockItem({ ...item, name: 'Våtservietter', type: 'wetWipes' });
  await actions.saveStockItem({ ...item, name: 'Toalettpapir', type: 'toiletPaper', quantity: 12 });

  await actions.saveContact({ name: 'Ola Nordmann', relation: 'Partner', phone: '+47 900 00 000' });
  await actions.saveContact({ name: 'Eva Hansen', relation: 'Nabo, har reservenøkkel', phone: '+47 900 00 001' });
  await actions.setMeetingPlace({ name: 'Skolegården', address: 'Storgata 40' });

  await actions.savePolicy({
    name: 'Innboforsikring',
    propertyId: home,
    company: 'Fremtind',
    sumKr: 600_000,
    deductibleKr: 4_000,
    alertNearSum: true,
  });
  // 620 590 kr in all, over the 600 000 insured, so Eiendeler warns. Bad and Bod are left empty.
  const things: [string, string, Belonging['category'], number | undefined][] = [
    [stue, 'Sofa', 'Møbler', 34_990],
    [stue, 'TV, 65"', 'Elektronikk', 21_990],
    [stue, 'Stereoanlegg', 'Elektronikk', 18_500],
    [stue, 'Spisebord og stoler', 'Møbler', 26_000],
    [stue, 'Maleri', 'Kunst', 38_000],
    [stue, 'Bokhylle og bøker', 'Møbler', 22_000],
    [stue, 'Teppe', 'Møbler', 12_500],
    [kjokken, 'Kjøleskap', 'Hvitevarer', 16_990],
    [kjokken, 'Komfyr med induksjonstopp', 'Hvitevarer', 19_990],
    [kjokken, 'Oppvaskmaskin', 'Hvitevarer', 9_990],
    [kjokken, 'Kaffemaskin', 'Kjøkkenutstyr', 11_990],
    [kjokken, 'Gryter, kniver og servise', 'Kjøkkenutstyr', 28_000],
    [soverom, 'Seng', 'Møbler', 29_990],
    [soverom, 'Klesskap', 'Møbler', 14_000],
    [soverom, 'Klær', 'Klær', 85_000],
    [soverom, 'Smykker', 'Smykker', 42_000],
    [barnerom, 'Seng og madrass', 'Møbler', 9_990],
    [barnerom, 'Leker og spill', 'Leker', 15_000],
    [barnerom, 'Nettbrett', 'Elektronikk', 6_990],
    [barnerom, 'Klær', 'Klær', 30_000],
    [gang, 'El-sykkel', 'Sport og fritid', 34_990],
    [gang, 'Ski og utstyr', 'Sport og fritid', 21_000],
    [gang, 'Yttertøy', 'Klær', 18_000],
    [gang, 'Verktøykasse', 'Verktøy', 14_000],
    [gang, 'Vinterdekk', 'Annet', 9_000],
    [kontor, 'Bærbar PC', 'Elektronikk', 18_990],
    [kontor, 'Skjerm, 27"', 'Elektronikk', 4_500],
    [kontor, 'Kontorstol', 'Møbler', 6_200],
    [kontor, 'Gitar', 'Musikkinstrument', undefined],
  ];
  for (const [roomId, name, category, valueKr] of things) {
    await actions.saveBelonging({ roomId, name, category, valueEstimated: false, ...(valueKr !== undefined && { valueKr }) });
  }

  await actions.saveProperty({ name: 'Hafjell', shortName: 'Hytta' });

  // Two documents with real files, so the document pages and the viewer can be checked.
  const passport = await actions.saveDocument({ name: 'Pass, Kari og Ola' });
  await addDemoFile(actions, passport, DEMO_PNG, 'image/png', 'png');
  const prescriptions = await actions.saveDocument({ name: 'Resepter og medisinliste' });
  await addDemoFile(actions, prescriptions, btoa(DEMO_PDF), 'application/pdf', 'pdf');
}

async function addDemoFile(
  actions: Omit<Store, 'load' | 'migrate'>,
  documentId: string,
  base64: string,
  mimeType: string,
  extension: string,
) {
  const temp = new File(Paths.cache, `demo.${extension}`);
  temp.write(base64, { encoding: 'base64' });
  // importFile deletes the temporary copy once it's in.
  const { fileName, size } = await importFile(temp.uri, mimeType);
  await actions.addDocumentFile({ documentId, fileName, mimeType, size });
}

/** A 30×40 pale blue PNG: enough to stand in for a photo of a passport page. */
const DEMO_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAB4AAAAoCAIAAABmcd1FAAAALUlEQVR42u3MMQ0AAAgDsPnXiAMccKGCg6RJ76Z6jkStVqvVarVarVar1f/rBSW96WVnkNBPAAAAAElFTkSuQmCC';

/** A one-page PDF with a line of text. */
const DEMO_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 24 Tf 72 760 Td (Medisinliste - eksempel) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;
