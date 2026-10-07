import type { IsoDate, Report } from '@egenberedskap/core';
import type { Owner } from '@egenberedskap/store';

import { formatDateWithYear, formatKr } from '@/lib/format';

/**
 * The «Innbooversikt» PDF as HTML, for expo-print: who it's for, then room by room with each
 * thing, its category and value, and the totals. Pictures and receipts come in as data URIs,
 * since the print view can't read the app's own files.
 */
export type ReportInput = {
  report: Report;
  owner: Owner;
  property: string;
  date: IsoDate;
  /** Belonging id → small picture. Left out when the user chose no pictures. */
  pictures: Map<string, string>;
  /** Receipt pictures, each on its own page at the end. */
  receipts: { name: string; dataUri: string }[];
  /** Receipts that are PDFs, which can't be put inside this one. */
  pdfReceipts: string[];
  includeEstimates: boolean;
};

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function reportHtml(input: ReportInput): string {
  const { report, owner } = input;
  const ownerLine = [owner.name, owner.birthDate && `f. ${formatDateWithYear(owner.birthDate)}`].filter(Boolean).join(' · ');
  const rooms = report.rooms
    .map(
      (room) => `
    <section class="room">
      <h2><span>${escape(room.name)}</span><span>${escape(formatKr(room.totalKr))}</span></h2>
      <table>
        ${room.lines
          .map((line) => {
            const picture = input.pictures.get(line.belonging.id);
            const value =
              line.valueKr !== undefined
                ? `${escape(formatKr(line.valueKr))}${line.estimate ? '<sup>*</sup>' : ''}`
                : line.estimate
                  ? 'Anslag utelatt'
                  : 'Ukjent';
            return `<tr>
          ${input.pictures.size > 0 ? `<td class="pic">${picture ? `<img src="${picture}" />` : ''}</td>` : ''}
          <td><div class="name">${escape(line.belonging.name)}</div><div class="muted">${escape(line.belonging.category)}</div></td>
          <td class="value">${value}</td>
        </tr>`;
          })
          .join('')}
      </table>
    </section>`,
    )
    .join('');

  const hasEstimates = report.rooms.some((r) => r.lines.some((l) => l.estimate && l.valueKr !== undefined));
  const receipts = input.receipts
    .map((r) => `<section class="receipt"><h2>Kvittering: ${escape(r.name)}</h2><img src="${r.dataUri}" /></section>`)
    .join('');

  return `<!doctype html>
<html lang="nb"><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: 11pt; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { display: flex; justify-content: space-between; font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; margin: 18pt 0 6pt; }
  .muted { color: #666; font-size: 9.5pt; }
  .summary { display: flex; gap: 24pt; margin: 12pt 0; }
  .summary div b { display: block; font-size: 16pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5pt 0; border-bottom: 1px solid #eee; vertical-align: middle; }
  td.pic { width: 52pt; }
  td.pic img { width: 44pt; height: 44pt; object-fit: cover; border-radius: 4pt; }
  td.value { text-align: right; white-space: nowrap; }
  .name { font-weight: 600; }
  .room { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  .receipt { page-break-before: always; }
  .receipt img { max-width: 100%; max-height: 640pt; }
  footer { margin-top: 18pt; }
</style></head><body>
  <h1>Innbooversikt</h1>
  <div>${escape(input.property)}</div>
  ${ownerLine ? `<div class="muted">${escape(ownerLine)}</div>` : ''}
  <div class="muted">Laget ${escape(formatDateWithYear(input.date))} med Egenberedskapsappen</div>
  <div class="summary">
    <div><b>${escape(formatKr(report.totalKr))}</b><span class="muted">samlet verdi</span></div>
    <div><b>${report.count}</b><span class="muted">${report.count === 1 ? 'gjenstand' : 'gjenstander'}</span></div>
    <div><b>${report.rooms.length}</b><span class="muted">rom</span></div>
  </div>
  ${rooms}
  <footer class="muted">
    ${hasEstimates ? '<div>* Anslått verdi, basert på lignende produkter.</div>' : ''}
    ${!input.includeEstimates ? '<div>Anslåtte verdier er ikke tatt med i summene.</div>' : ''}
    ${input.pdfReceipts.length > 0 ? `<div>Kvitteringer som PDF sendes for seg: ${input.pdfReceipts.map(escape).join(', ')}.</div>` : ''}
  </footer>
  ${receipts}
</body></html>`;
}
