export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date string e.g. '2026-10-08'
  formattedDate: string; // Norwegian e.g. '8. oktober 2026'
  readingTime: string;
  category: string;
  excerpt: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: '7-dager-egenberedskap',
    title: 'Klar for en uke i eget hjem: Dette trenger husstanden',
    description:
      'Direktoratet for samfunnssikkerhet og beredskap (DSB) anbefaler at alle husstander er rustet til å klare seg selv i 7 dager. Her er den konkrete listen over hva dere trenger av vann, mat, varme og lys.',
    date: '2026-10-08',
    formattedDate: '8. oktober 2026',
    readingTime: '5 min lesetid',
    category: 'Egenberedskap',
    excerpt:
      'Norske myndigheter anbefaler nå at alle husstander kan klare seg selv i minst en hel uke. Her går vi gjennom de viktigste grepene for vann, mat, varme og kriseinformasjon.',
  },
  {
    slug: 'lagring-av-drikkevann',
    title: 'Slik lagrer du drikkevann trygt i ett år',
    description:
      'Vann er det viktigste i egenberedskapen. Lær hvordan du vasker kanner, fyller og lagrer drikkevann trygt slik at det holder seg friskt i minst 12 måneder.',
    date: '2026-10-05',
    formattedDate: '5. oktober 2026',
    readingTime: '4 min lesetid',
    category: 'Vann og hygiene',
    excerpt:
      'Uten vann stopper hverdagen raskt opp. Med rene kanner, kaldt kranvann og riktig oppbevaring har husstanden trygt drikkevann som holder i minst ett år.',
  },
  {
    slug: 'dokumentere-innbo',
    title: 'Hvorfor du bør dokumentere innboet før uhellet er ute',
    description:
      'Hva husker du av det du eier hvis boligen brenner eller rammes av stor vannskade? Dokumentasjon av innbo sikrer riktig erstatning og forebygger underforsikring.',
    date: '2026-09-28',
    formattedDate: '28. september 2026',
    readingTime: '4 min lesetid',
    category: 'Trygghet og forsikring',
    excerpt:
      'Etter en brann eller flom må du bevise hva du eide. Uten oversikt og bilder risikerer du å tape hundretusener i forsikringsoppgjøret.',
  },
];
