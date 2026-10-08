import {
  CLAIM_KINDS,
  DAMAGES,
  type ClaimKind,
  type ClaimProblem,
  type Damage,
} from '@egenberedskap/core';

export const CLAIM_KIND_LABELS: Record<ClaimKind, string> = {
  water: 'Vannskade',
  fire: 'Brann',
  theft: 'Tyveri',
  weather: 'Naturskade',
  other: 'Annen skade',
};

export const DAMAGE_LABELS: Record<Damage, string> = {
  destroyed: 'Totalt ødelagt',
  damaged: 'Skadet',
  stolen: 'Stjålet',
};

export const CLAIM_PROBLEM_INFO: Record<ClaimProblem, { title: string; detail: string }> = {
  deadlinePassed: {
    title: 'Fristen kan være utløpt',
    detail: 'Etter forsikringsavtaleloven § 8-5 tapes normalt kravet dersom det ikke meldes innen ett år etter hendelsen.',
  },
  deadlineSoon: {
    title: 'Meldingsfristen nærmer seg',
    detail: 'Skaden må meldes til forsikringsselskapet innen ett år (forsikringsavtaleloven § 8-5).',
  },
  noPoliceReport: {
    title: 'Politianmeldelse mangler',
    detail: 'Forsikringsselskapet krever normalt anmeldelsesnummer ved tyveri og innbrudd.',
  },
  noItems: {
    title: 'Ingen gjenstander lagt til',
    detail: 'Legg til ting som er ødelagt eller stjålet for å dokumentere tapet.',
  },
  noPhotos: {
    title: 'Ingen bilder av skaden',
    detail: 'Bilder av skaden gjør det enklere for forsikringsselskapet å vurdere erstatningen.',
  },
  unknownValues: {
    title: 'Noen gjenstander mangler verdi',
    detail: 'Legg inn anslått verdi eller kjøpesum for alle tingene.',
  },
};

export const CLAIM_KIND_OPTIONS = CLAIM_KINDS.map((kind) => ({
  value: kind,
  label: CLAIM_KIND_LABELS[kind],
}));

export const DAMAGE_OPTIONS = DAMAGES.map((damage) => ({
  value: damage,
  label: DAMAGE_LABELS[damage],
}));
