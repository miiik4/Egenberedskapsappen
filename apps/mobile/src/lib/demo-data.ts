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
