import type { ClaimTotals } from '@egenberedskap/core';
import type { Owner, StoredClaim } from '@egenberedskap/store';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';

import { isPdf, storedFile } from '@/documents/files';
import { todayIso } from '@/lib/format';

import { claimReportHtml } from './claim-report-html';
import { CLAIM_KIND_LABELS } from './claim-types';

const PHOTO_SIDE = 480;
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
    return null;
  }
}

export async function shareClaimReport(input: {
  claim: StoredClaim;
  totals: ClaimTotals;
  deductibleKr?: number;
  owner?: Owner;
  property?: string;
  policyCompany?: string;
}) {
  const photoUris: string[] = [];
  for (const photo of input.claim.photos) {
    const uri = await dataUri(photo.fileName, PHOTO_SIDE);
    if (uri) photoUris.push(uri);
  }

  const receipts: { name: string; dataUri: string }[] = [];
  const pdfReceipts: string[] = [];
  for (const item of input.claim.items) {
    if (!item.receipt) continue;
    if (isPdf(item.receipt.mimeType)) {
      pdfReceipts.push(item.name);
      continue;
    }
    const uri = await dataUri(item.receipt.fileName, RECEIPT_SIDE);
    if (uri) receipts.push({ name: item.name, dataUri: uri });
  }

  const html = claimReportHtml({
    claim: input.claim,
    totals: input.totals,
    deductibleKr: input.deductibleKr,
    owner: input.owner,
    property: input.property,
    policyCompany: input.policyCompany,
    date: todayIso(),
    photos: photoUris,
    receipts,
    pdfReceipts,
  });

  const { uri } = await printToFileAsync({
    html,
    margins: { left: 36, right: 36, top: 40, bottom: 40 },
  });

  const kindLabel = CLAIM_KIND_LABELS[input.claim.kind] ?? 'Skade';
  const fileName = `Skademelding ${kindLabel} ${todayIso()}.pdf`;
  const named = new File(new File(uri).parentDirectory, fileName);
  if (named.exists) named.delete();
  new File(uri).move(named);

  try {
    await Sharing.shareAsync(named.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Skaderapport – ${kindLabel}`,
    });
  } finally {
    if (named.exists) named.delete();
  }
}
