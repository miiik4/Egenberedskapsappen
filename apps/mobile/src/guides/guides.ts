import {
  STORED_WATER_SHELF_LIFE_MONTHS,
  TARGET_DAYS,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type GuideId,
} from '@egenberedskap/core';

// TODO(before launch): have every guide checked against DSB's advice (sikkerhverdag.no),
// as for the figures in guidance.ts. The text here is a first draft.

export type Guide = {
  id: GuideId;
  title: string;
  minutes: number;
  sections: { heading: string; points: string[] }[];
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
          'Skaff en varmekilde som virker uten strøm, som vedovn, og ha ved eller brensel til en uke.',
          'Ha ullpledd eller sovepose til alle som bor hjemme.',
          'Legg lommelykt, batterier og DAB-radio på batteri et fast sted alle vet om.',
          `Ha vann og mat for ${week}, og noen kontanter.`,
        ],
      },
      {
        heading: 'Når strømmen går',
        points: [
          'Samle dere i ett rom og hold dørene lukket, så holder dere på varmen.',
          'Kle dere lag på lag, helst med ull innerst.',
          'Lytt på NRK på DAB-radioen. Der kommer beskjeder fra myndighetene.',
          'Bruk aldri grill, gassbrenner eller propanovn som ikke er laget for innendørs bruk. De kan gi kullosforgiftning.',
          'Spar på mobilbatteriet: skru ned lysstyrken og slå av det du ikke trenger.',
        ],
      },
      {
        heading: 'Hjelp hverandre',
        points: ['Sjekk på naboer som bor alene, er eldre eller syke.'],
      },
    ],
  },
  planSevenDays: {
    id: 'planSevenDays',
    title: `Lag en plan for ${week}`,
    minutes: 4,
    sections: [
      {
        heading: 'Snakk sammen',
        points: [
          'Bli enige om hvor dere møtes hvis dere ikke får kontakt. Legg møtestedet inn under Nødinfo.',
          'Skriv ned nødkontakter, også en som bor et annet sted.',
          'Avtal hvem som henter barna, og hvem som sjekker på dyrene.',
        ],
      },
      {
        heading: 'Gå gjennom lageret',
        points: [
          `DSB anbefaler at husstanden klarer seg selv i ${week}.`,
          'Fyll ut Lager i appen, så ser dere hva som mangler.',
          'Gjør kvartalssjekken, så holder dere lageret oppdatert.',
        ],
      },
    ],
  },
  storeWater: {
    id: 'storeWater',
    title: 'Lagre og rense vann',
    minutes: 3,
    sections: [
      {
        heading: 'Hvor mye',
        points: [`Regn med ${water} per person per døgn, til drikke og matlaging. Dyr trenger vann i tillegg.`],
      },
      {
        heading: 'Slik lagrer dere det',
        points: [
          'Bruk rene kanner eller flasker som er laget for drikkevann.',
          'Fyll dem fra springen og oppbevar dem mørkt og kjølig.',
          `Bytt vannet hver ${STORED_WATER_SHELF_LIFE_MONTHS}. måned. Appen minner dere på det.`,
        ],
      },
      {
        heading: 'Hvis vannet blir forurenset',
        points: [
          'Følg rådene fra kommunen.',
          'Kok vannet, eller bruk vannrensetabletter etter bruksanvisningen.',
        ],
      },
    ],
  },
  childrenAndPets: {
    id: 'childrenAndPets',
    title: 'Beredskap med barn og dyr',
    minutes: 5,
    sections: [
      {
        heading: 'Barn',
        points: [
          'Ha barnemat, bleier og det barnet trenger for en uke.',
          'Snakk rolig med barna om hva som skjer. Gi dem en oppgave, som å holde lommelykten.',
          'Ta med noe kjent, som en bamse eller et spill uten strøm.',
        ],
      },
      {
        heading: 'Dyr',
        points: [
          'Ha fôr til en uke for hvert dyr, og vann i tillegg til husstandens.',
          'Ha med bur, bånd og eventuelle medisiner hvis dere må dra.',
        ],
      },
    ],
  },
};

/** In the order «Kom i gang» lists them. */
export const GUIDE_LIST: Guide[] = [GUIDES.planSevenDays, GUIDES.storeWater, GUIDES.childrenAndPets, GUIDES.winterPowerOutage];
