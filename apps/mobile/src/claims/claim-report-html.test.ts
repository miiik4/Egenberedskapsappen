import { describe, expect, it } from 'vitest';

import { formatKr } from '@/lib/format';
import { claimReportHtml } from './claim-report-html';

describe('claimReportHtml', () => {
  it('generates a full claim report HTML with metadata, items, and totals', () => {
    const html = claimReportHtml({
      claim: {
        id: 'c1',
        kind: 'water',
        happenedOn: '2026-10-01',
        description: 'Vannlekkasje fra oppvaskmaskin',
        policeReport: undefined,
        reportedOn: '2026-10-05',
        photos: [],
        items: [
          {
            id: 'i1',
            claimId: 'c1',
            name: 'Kjøkkenbord',
            category: 'Møbler',
            damage: 'damaged',
            valueKr: 8_000,
            valueEstimated: false,
          },
          {
            id: 'i2',
            claimId: 'c1',
            name: 'Teppe',
            category: 'Annet',
            damage: 'destroyed',
            valueKr: 3_000,
            valueEstimated: true,
          },
        ],
      },
      totals: {
        totalKr: 11_000,
        estimatedKr: 3_000,
        unknownCount: 0,
        afterDeductibleKr: 7_000,
      },
      deductibleKr: 4_000,
      owner: { name: 'Ola Nordmann', birthDate: '1985-05-15' },
      property: 'Hovedbolig',
      policyCompany: 'Gjensidige',
      date: '2026-10-08',
      photos: [],
      receipts: [],
    });

    expect(html).toContain('Skademelding – Vannskade');
    expect(html).toContain('Hovedbolig');
    expect(html).toContain('Ola Nordmann');
    expect(html).toContain('Gjensidige');
    expect(html).toContain('Vannlekkasje fra oppvaskmaskin');
    expect(html).toContain('Kjøkkenbord');
    expect(html).toContain('Skadet');
    expect(html).toContain('Totalt ødelagt');
    expect(html).toContain(formatKr(11_000));
    expect(html).toContain(formatKr(4_000));
    expect(html).toContain(formatKr(7_000));
    expect(html).toContain('forsikringsavtaleloven § 8-5');
  });

  it('includes police report number for theft claims', () => {
    const html = claimReportHtml({
      claim: {
        id: 'c2',
        kind: 'theft',
        happenedOn: '2026-10-02',
        description: 'Sykkel stjålet fra bod',
        policeReport: '08123456/26',
        photos: [],
        items: [],
      },
      totals: {
        totalKr: 0,
        estimatedKr: 0,
        unknownCount: 0,
        afterDeductibleKr: 0,
      },
      date: '2026-10-08',
      photos: [],
      receipts: [],
    });

    expect(html).toContain('Skademelding – Tyveri');
    expect(html).toContain('08123456/26');
    expect(html).toContain('Status: Foreløpig oversikt (utkast)');
  });
});
