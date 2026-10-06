import { addDays } from '@egenberedskap/core';
import type { AppData, Store } from '@egenberedskap/store';
import { File, Paths } from 'expo-file-system';

import { importFile } from '@/documents/files';

import { todayIso } from './format';

/**
 * Development only: fills a fresh install with the household from the iOS design, with
 * dates relative to today, so every screen can be checked without typing it all in.
 */
export async function seedDemoData(actions: Omit<Store, 'load' | 'migrate'>, data: AppData) {
  const inDays = (days: number) => addDays(todayIso(), days);

  const home =
    data.onboarded && data.selectedPropertyId
      ? data.selectedPropertyId
      : await actions.completeOnboarding({
          members: { adults: 2, seniors: 0, children: 1, infants: 0, dogs: 1, cats: 0 },
          items: [],
          homeName: 'Storgata 12',
        });
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
  await actions.saveStockItem({ ...item, name: 'Lapskaus', type: 'cannedMeals', quantity: 3, meals: 3, expiresOn: inDays(21) });
  await actions.saveStockItem({ ...item, name: 'Bønner i tomatsaus', type: 'cannedMeals', quantity: 4, meals: 2, expiresOn: '2028-03-01' });
  await actions.saveStockItem({ ...item, name: 'Tomatsuppe', type: 'cannedMeals', quantity: 4, meals: 2, expiresOn: '2027-06-01' });
  await actions.saveStockItem({ ...item, name: 'Makrell i tomat', type: 'cannedMeals', quantity: 2, meals: 1, expiresOn: '2028-05-01' });
  await actions.saveStockItem({ ...item, name: 'Knekkebrød', type: 'crispbread', quantity: 2, meals: 4, expiresOn: inDays(13) });
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
  const { fileName, size } = await importFile(temp.uri, mimeType);
  temp.delete();
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
