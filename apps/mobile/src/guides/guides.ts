import {
  STORED_WATER_SHELF_LIFE_MONTHS,
  TARGET_DAYS,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type GuideId,
} from '@egenberedskap/core';

// Råd og veiledninger basert på DSBs offisielle anbefalinger for egenberedskap (sikkerhverdag.no / dsb.no).
// Oppdatert etter reviderte råd (7 døgn / 1 uke).

export type Guide = {
  id: GuideId;
  title: string;
  minutes: number;
  sections: { heading: string; points: string[] }[];
  /** Where to read more, opened in the browser. */
  link?: { label: string; url: string };
};

const week = `${TARGET_DAYS} døgn`;
const water = `${WATER_LITRES_PER_PERSON_PER_DAY} liter`;

export const GUIDES: Record<GuideId, Guide> = {
  winterPowerOutage: {
    id: 'winterPowerOutage',
    title: 'Klar for strømbrudd i vinter',
    minutes: 6,
    sections: [
      {
        heading: 'Før det skjer',
        points: [
          'Skaff en alternativ varmekilde som virker uten strøm, for eksempel vedovn eller gassovn egnet for innendørs bruk, og ha brensel til minst en uke.',
          'Ha varme klær, ullpledd og soveposer til alle i husstanden.',
          'Legg lommelykt, hodelykt, ekstra batterier og DAB-radio på batteri/sveiv på en fast plass alle vet om.',
          `Ha rent drikkevann og mat for ${week}, og litt kontanter i små sedler og mynter.`,
        ],
      },
      {
        heading: 'Når strømmen går',
        points: [
          'Samle dere i ett rom, lukk dørene og trekk for gardinene for å holde på varmen.',
          'Kle dere lag på lag, helst med ull innerst.',
          'Lytt til NRK P1 på DAB-radioen for offisiell kriseinformasjon fra myndighetene.',
          'Bruk aldri utegrill, stormkjøkken eller apparater som ikke er godkjent for innendørs bruk innendørs. Det gir livsfarlig kullosforgiftning.',
          'Spar på batteriet på mobilen: slå på strømsparingsmodus, senk lysstyrken og slå av unødvendige apper.',
        ],
      },
      {
        heading: 'Hjelp hverandre',
        points: ['Sjekk på naboer og andre rundt dere som bor alene eller kan trenge ekstra hjelp.'],
      },
    ],
    link: { label: 'Les om strømbrudd på sikkerhverdag.no', url: 'https://www.sikkerhverdag.no/strombrudd' },
  },
  planSevenDays: {
    id: 'planSevenDays',
    title: `Lag en plan for ${week}`,
    minutes: 4,
    sections: [
      {
        heading: 'Snakk sammen',
        points: [
          'Bli enige om en felles møteplass utenfor hjemmet hvis dere ikke får kontakt. Legg møtestedet inn under Nødinfo.',
          'Skriv ned viktige telefonnumre på papir, inkludert en kontaktperson som bor et annet sted i landet.',
          'Avtal hvem som henter barna, og hvem som passer på eventuelle kjæledyr.',
        ],
      },
      {
        heading: 'Gå gjennom beredskapslageret',
        points: [
          `DSB anbefaler at alle husstander i Norge kan klare seg selv i minst ${week}.`,
          'Fyll ut Lager i appen for å få oversikt over hva dere har og hva som mangler.',
          'Gjennomfør beredskapssjekken jevnlig for å rullere varer som nærmer seg utløpsdato.',
        ],
      },
    ],
    link: { label: 'Les om egenberedskap på sikkerhverdag.no', url: 'https://www.sikkerhverdag.no/egenberedskap' },
  },
  storeWater: {
    id: 'storeWater',
    title: 'Lagre og rense vann',
    minutes: 3,
    sections: [
      {
        heading: 'Hvor mye',
        points: [
          `DSB anbefaler minst ${water} per person per døgn (minst 20 liter for en uke) til drikke og enkel matlaging. Kjæledyr trenger vann i tillegg.`,
        ],
      },
      {
        heading: 'Slik lagrer dere det',
        points: [
          'Bruk rene kanner eller flasker av næringsmiddelgodkjent plast som er beregnet for drikkevann.',
          'Vask kannene med såpe og vann, skyll godt, og desinfiser gjerne med 2 spiseskjeer husholdningsklor per 10 liter vann før skylling og fylling.',
          'Fyll kannene helt fulle med kaldt vann rett fra springen, og oppbevar dem mørkt, kjølig og frostfritt.',
          `Bytt ut det lagrede vannet én gang i året (hver ${STORED_WATER_SHELF_LIFE_MONTHS}. måned). Appen minner dere på det.`,
        ],
      },
      {
        heading: 'Hvis vannet blir forurenset',
        points: [
          'Følg kokeråd og varsler fra kommunen eller vannverket.',
          'Fosskok vannet i minst ett minutt for å drepe bakterier, virus og parasitter.',
          'Alternativt kan dere bruke vannrensetabletter (klortabletter) nøyaktig etter produsentens anvisning.',
        ],
      },
    ],
    link: { label: 'Les om lagring av vann på sikkerhverdag.no', url: 'https://www.sikkerhverdag.no/lagring-av-vann' },
  },
  childrenAndPets: {
    id: 'childrenAndPets',
    title: 'Beredskap med barn og dyr',
    minutes: 5,
    sections: [
      {
        heading: 'Barn',
        points: [
          'Ha barnemat, morsmelkerstatning, bleier, våtservietter og faste medisiner for minst en uke.',
          'Husk jodtabletter (Kaliumjodid) for barn og unge under 18 år, samt gravide og ammende.',
          'Snakk rolig med barna om hva som skjer, og la dem bidra med enkle oppgaver.',
          'Pakk leker, bøker, tegnesaker eller spill som fungerer uten strøm og skjerm.',
        ],
      },
      {
        heading: 'Kjæledyr',
        points: [
          'Ha fôr for minst en uke for hvert dyr, og beregn ekstra drikkevann (ca. 1 liter per hund, 0,25 liter per katt per døgn).',
          'Ha transportbur, bånd, faste medisiner og eventuelt teppe klart dersom dere må forflytte dere.',
        ],
      },
    ],
    link: { label: 'Les mer hos DSB', url: 'https://www.sikkerhverdag.no/egenberedskap' },
  },
  // Beredskapsvenn is DSB's campaign: the guide explains it and links to them, and the
  // agreement itself is made between neighbours, not in the app.
  preparednessFriend: {
    id: 'preparednessFriend',
    title: 'Avtal en beredskapsvenn',
    minutes: 3,
    sections: [
      {
        heading: 'Hva det er',
        points: [
          'En beredskapsvenn er en nabo, venn eller et familiemedlem dere har avtalt å samarbeide med og hjelpe hvis en krise oppstår.',
          'Det er DSB som oppfordrer alle til å finne en beredskapsvenn for å styrke lokalsamfunnets motstandskraft.',
        ],
      },
      {
        heading: 'Avtal det før det skjer',
        points: [
          'Kartlegg ressurser: Kanskje du har vedovn, mens naboen har stormkjøkken eller bil.',
          'Bli enige om hva dere kan hjelpe hverandre med: se til hverandre, dele vann og mat, lade telefonen, eller hente barn.',
          'Fortell hverandre om spesielle behov, som faste medisiner eller behov for ekstra tilsyn.',
          'Legg beredskapsvennen inn som nødkontakt under Nødinfo i appen, slik at kontaktinfoen er tilgjengelig uten strøm og nett.',
        ],
      },
      {
        heading: 'Når noe skjer',
        points: [
          'Ta kontakt så snart situasjonen krever det, og sett avtalen ut i livet.',
          'Får dere ikke kontakt på telefon, oppsøk hverandre fysisk hvis det er trygt.',
        ],
      },
    ],
    link: { label: 'Les om beredskapsvenn hos DSB', url: 'https://www.dsb.no/feature/finn-din-beredskapsvenn/' },
  },
};

/** In the order «Kom i gang» lists them. */
export const GUIDE_LIST: Guide[] = [
  GUIDES.planSevenDays,
  GUIDES.storeWater,
  GUIDES.childrenAndPets,
  GUIDES.preparednessFriend,
  GUIDES.winterPowerOutage,
];
