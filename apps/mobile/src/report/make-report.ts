import type { Report } from '@egenberedskap/core';
import type { Owner, StoredBelonging } from '@egenberedskap/store';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { isPdf, storedFile } from '@/documents/files';
import { todayIso } from '@/lib/format';

import { reportHtml } from './report-html';

/** A picture in the PDF: small, since there may be hundreds. */
const PICTURE_SIDE = 240;
/** A receipt has to be readable. */
const RECEIPT_SIDE = 1400;

async function dataUri(fileName: string, maxSide: number): Promise<string | null> {
  try {
    const image = await ImageManipulator.manipulate(storedFile(fileName).uri).renderAsync();
    const size = image.width >= image.height ? { width: Math.min(maxSide, image.width) } : { height: Math.min(maxSide, image.height) };
    const resized = await ImageManipulator.manipulate(image).resize(size).renderAsync();
    const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    new File(saved.uri).delete();
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } catch {
    // A picture that won't load leaves a gap, not a failed report.
    return null;
  }
}

/**
 * Android only: where a shared report waits until the next report or the next launch. The share
 * sheet there returns before the receiving app has read the file (Gmail and Outlook often
 * attach it in the background after their compose screen closes), so deleting it straight away
 * can send an empty attachment. It's in the app's private cache, which isn't backed up.
 */
const sharedReports = () => new Directory(Paths.cache, 'innbooversikt');

/** Deletes reports left from earlier shares on Android. Called on launch and before a new report. */
export function clearSharedReports() {
  if (Platform.OS !== 'android') return;
  try {
    const folder = sharedReports();
    if (folder.exists) folder.delete();
  } catch {
    // Tried again next time; it's only a cache.
  }
}

/**
 * Makes the PDF and opens the share sheet, so it can go straight to the insurer by mail or be
 * saved to Files. The PDF is deleted from the app again afterwards: it's a copy of the
 * belongings, and the belongings themselves are what's kept. On iOS that's as soon as the
 * share sheet closes; on Android at the next report or launch (`clearSharedReports`).
 */
export async function shareReport(input: {
  report: Report<StoredBelonging>;
  owner: Owner;
  property: string;
  includePictures: boolean;
  includeReceipts: boolean;
  includeEstimates: boolean;
}) {
  clearSharedReports();
  const things = input.report.rooms.flatMap((r) => r.lines.map((l) => l.belonging));
  const pictures = new Map<string, string>();
  if (input.includePictures) {
    for (const thing of things) {
      const uri = thing.photo && (await dataUri(thing.photo.fileName, PICTURE_SIDE));
      if (uri) pictures.set(thing.id, uri);
    }
  }
  const receipts: { name: string; dataUri: string }[] = [];
  const pdfReceipts: string[] = [];
  if (input.includeReceipts) {
    for (const thing of things) {
      if (!thing.receipt) continue;
      if (isPdf(thing.receipt.mimeType)) {
        pdfReceipts.push(thing.name);
        continue;
      }
      const uri = await dataUri(thing.receipt.fileName, RECEIPT_SIDE);
      if (uri) receipts.push({ name: thing.name, dataUri: uri });
    }
  }

  const html = reportHtml({
    report: input.report,
    owner: input.owner,
    property: input.property,
    date: todayIso(),
    pictures,
    receipts,
    pdfReceipts,
    includeEstimates: input.includeEstimates,
    // `margins` below only works on iOS; Android takes them from CSS.
    pageMargins: Platform.OS === 'android',
  });
  const { uri } = await printToFileAsync({ html, margins: { left: 36, right: 36, top: 40, bottom: 40 } });
  if (Platform.OS === 'android') {
    const folder = sharedReports();
    folder.create({ idempotent: true });
    // A name the insurer can tell apart from other attachments.
    const named = new File(folder, `Innbooversikt ${todayIso()}.pdf`);
    new File(uri).move(named);
    await Sharing.shareAsync(named.uri, { mimeType: 'application/pdf', dialogTitle: 'Innbooversikt' });
    return;
  }
  // A name the insurer can tell apart from other attachments.
  const named = new File(new File(uri).parentDirectory, `Innbooversikt ${todayIso()}.pdf`);
  if (named.exists) named.delete();
  new File(uri).move(named);
  try {
    await Sharing.shareAsync(named.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Innbooversikt' });
  } finally {
    if (named.exists) named.delete();
  }
}
