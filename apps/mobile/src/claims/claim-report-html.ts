import type { ClaimTotals, IsoDate } from '@egenberedskap/core';
import type { Owner, StoredClaim } from '@egenberedskap/store';

import { formatDate, formatDateWithYear, formatKr } from '@/lib/format';

import { CLAIM_KIND_LABELS, DAMAGE_LABELS } from './claim-types';

export type ClaimReportHtmlInput = {
  claim: StoredClaim;
  totals: ClaimTotals;
  deductibleKr?: number;
  owner?: Owner;
  property?: string;
  policyCompany?: string;
  date: IsoDate;
  photos: string[];
  receipts: { name: string; dataUri: string }[];
  pdfReceipts?: string[];
};

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function claimReportHtml(input: ClaimReportHtmlInput): string {
  const { claim, totals, deductibleKr, owner, property, policyCompany, date, photos, receipts, pdfReceipts = [] } = input;

  const kindLabel = CLAIM_KIND_LABELS[claim.kind] ?? claim.kind;
  const ownerLine = owner
    ? [owner.name, owner.birthDate && `f. ${formatDateWithYear(owner.birthDate)}`].filter(Boolean).join(' · ')
    : '';

  const rows = claim.items
    .map((item) => {
      const damageLabel = DAMAGE_LABELS[item.damage] ?? item.damage;
      const value = item.valueKr !== undefined
        ? `${escape(formatKr(item.valueKr))}${item.valueEstimated ? '<sup>*</sup>' : ''}`
        : 'Ukjent';
      const receiptMarker = item.receipt ? ' · Kvittering vedlagt' : '';

      return `<tr>
        <td>
          <div class="name">${escape(item.name)}</div>
          <div class="muted">${escape(item.category)} · ${escape(damageLabel)}${receiptMarker}</div>
        </td>
        <td class="value">${value}</td>
      </tr>`;
    })
    .join('');

  const photoGrid = photos.length > 0
    ? `<section class="photos-section">
        <h2>Bilder av skaden (${photos.length})</h2>
        <div class="grid">
          ${photos.map((uri) => `<div class="photo-card"><img src="${uri}" /></div>`).join('')}
        </div>
      </section>`
    : '';

  const receiptSections = receipts
    .map((r) => `<section class="receipt"><h2>Kvittering: ${escape(r.name)}</h2><img src="${r.dataUri}" /></section>`)
    .join('');

  const hasEstimates = claim.items.some((i) => i.valueEstimated && i.valueKr !== undefined);

  return `<!doctype html>
<html lang="nb"><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: 11pt; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; margin: 18pt 0 6pt; }
  .muted { color: #666; font-size: 9.5pt; }
  .claim-meta { margin-bottom: 12pt; }
  .summary { display: flex; gap: 20pt; margin: 14pt 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6pt; padding: 10pt 14pt; }
  .summary div b { display: block; font-size: 15pt; color: #0b2b4a; }
  .desc-box { background: #fdfdfd; border: 1px solid #eee; border-left: 3px solid #0b2b4a; padding: 8pt 12pt; margin: 10pt 0 16pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6pt 0; border-bottom: 1px solid #eee; vertical-align: middle; }
  td.value { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .name { font-weight: 600; font-size: 11.5pt; }
  .grid { display: flex; flex-wrap: wrap; gap: 10pt; margin-top: 8pt; }
  .photo-card img { width: 170pt; height: 130pt; object-fit: cover; border-radius: 4pt; border: 1px solid #ddd; }
  tr { page-break-inside: avoid; }
  .photos-section { page-break-inside: auto; margin-top: 16pt; }
  .receipt { page-break-before: always; }
  .receipt img { max-width: 100%; max-height: 640pt; }
  footer { margin-top: 20pt; font-size: 9.5pt; color: #666; border-top: 1px solid #eee; padding-top: 10pt; }
</style></head><body>
  <h1>Skademelding – ${escape(kindLabel)}</h1>
  <div class="claim-meta">
    ${property ? `<div><b>Bolig:</b> ${escape(property)}</div>` : ''}
    ${ownerLine ? `<div><b>Forsikringstaker:</b> ${escape(ownerLine)}</div>` : ''}
    ${policyCompany ? `<div><b>Forsikringsselskap:</b> ${escape(policyCompany)}</div>` : ''}
    <div><b>Skadedato:</b> ${escape(formatDateWithYear(claim.happenedOn))}</div>
    ${claim.policeReport ? `<div><b>Politianmeldelsesnummer:</b> ${escape(claim.policeReport)}</div>` : ''}
    ${claim.reportedOn ? `<div><b>Meldt til forsikringsselskap:</b> ${escape(formatDateWithYear(claim.reportedOn))}</div>` : '<div class="muted">Status: Foreløpig oversikt (utkast)</div>'}
    <div class="muted">Dokumentert ${escape(formatDate(date))} med Egenberedskapsappen</div>
  </div>

  ${claim.description ? `
  <div><b>Beskrivelse av skaden:</b></div>
  <div class="desc-box">${escape(claim.description)}</div>` : ''}

  <div class="summary">
    <div><b>${escape(formatKr(totals.totalKr))}</b><span class="muted">samlet dokumentert tap</span></div>
    <div><b>${deductibleKr !== undefined ? escape(formatKr(deductibleKr)) : '0 kr'}</b><span class="muted">egenandel</span></div>
    <div><b>${escape(formatKr(totals.afterDeductibleKr))}</b><span class="muted">estimert erstatning</span></div>
    <div><b>${claim.items.length}</b><span class="muted">${claim.items.length === 1 ? 'gjenstand' : 'gjenstander'}</span></div>
  </div>

  <section>
    <h2>Skadede og tapte gjenstander (${claim.items.length})</h2>
    ${claim.items.length === 0 ? '<p class="muted">Ingen gjenstander registrert.</p>' : `<table>${rows}</table>`}
  </section>

  ${photoGrid}

  <footer class="muted">
    ${hasEstimates ? '<div>* Anslått verdi basert på lignende produkter.</div>' : ''}
    ${totals.unknownCount > 0 ? `<div>${totals.unknownCount} gjenstand(er) har uoppgitt verdi.</div>` : ''}
    ${pdfReceipts.length > 0 ? `<div>Kvitteringer i PDF-format må ettersendes separat: ${pdfReceipts.map(escape).join(', ')}.</div>` : ''}
    <div style="margin-top: 6pt;">Rapporten er generert i Egenberedskapsappen. Meldingen er underlagt fristreglene i forsikringsavtaleloven § 8-5.</div>
  </footer>

  ${receiptSections}
</body></html>`;
}
