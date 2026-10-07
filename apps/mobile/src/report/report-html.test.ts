import { buildReport, type Belonging } from '@egenberedskap/core';
import { describe, expect, it } from 'vitest';

import { formatKr } from '@/lib/format';

import { reportHtml } from './report-html';

const things: Belonging[] = [
  { id: 'tv', roomId: 'stue', name: 'TV <Samsung> & stativ', category: 'Elektronikk', valueKr: 12_000, valueEstimated: false },
  { id: 'sofa', roomId: 'stue', name: 'Sofa', category: 'Møbler', valueKr: 8_000, valueEstimated: true },
];
const report = (includeEstimates: boolean) => buildReport([{ id: 'stue', name: 'Stue' }], things, { includeEstimates });
const base = {
  owner: { name: 'Kari Nordmann', birthDate: '1985-03-14' },
  property: 'Storgata 12',
  date: '2026-10-06',
  pictures: new Map<string, string>(),
  receipts: [],
  pdfReceipts: [],
};

describe('reportHtml', () => {
  it('names the owner, the home and the totals, and marks estimates', () => {
    const html = reportHtml({ ...base, report: report(true), includeEstimates: true });
    expect(html).toContain('Kari Nordmann · f. 14. mars 1985');
    expect(html).toContain('Storgata 12');
    expect(html).toContain(formatKr(20_000));
    expect(html).toContain(`${formatKr(8_000)}<sup>*</sup>`);
    expect(html).toContain('Anslått verdi');
  });

  it('escapes what the user typed', () => {
    const html = reportHtml({ ...base, report: report(true), includeEstimates: true });
    expect(html).toContain('TV &lt;Samsung&gt; &amp; stativ');
    expect(html).not.toContain('<Samsung>');
  });

  it('says when estimates are left out of the sums', () => {
    const html = reportHtml({ ...base, report: report(false), includeEstimates: false });
    expect(html).toContain('Anslag utelatt');
    expect(html).toContain(formatKr(12_000));
    expect(html).toContain('ikke tatt med i summene');
  });

  it('adds pictures and receipt pages only when there are some', () => {
    const plain = reportHtml({ ...base, report: report(true), includeEstimates: true });
    expect(plain).not.toContain('<img');
    const full = reportHtml({
      ...base,
      report: report(true),
      includeEstimates: true,
      pictures: new Map([['tv', 'data:image/jpeg;base64,AAA']]),
      receipts: [{ name: 'TV', dataUri: 'data:image/jpeg;base64,BBB' }],
      pdfReceipts: ['Sofa'],
    });
    expect(full).toContain('data:image/jpeg;base64,AAA');
    expect(full).toContain('Kvittering: TV');
    expect(full).toContain('PDF sendes for seg: Sofa');
  });
});
