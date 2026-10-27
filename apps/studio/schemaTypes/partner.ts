import { CaseIcon } from '@sanity/icons/Case';
import { defineField, defineType } from 'sanity';

/** Same shape as the draft page's placeholder (CAPITALS, digits, hyphens between parts), easy to type in. */
const CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A partner's landing page, egenberedskapsappen.no/for/<slug>. The website is static: a page exists only after a
 * new build, and only for published partners with «Avtale signert» on (AGENTS.md: never name a partner without a
 * signed agreement).
 */
export const partner = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  icon: CaseIcon,
  groups: [
    { name: 'agreement', title: 'Avtale', default: true },
    { name: 'page', title: 'Siden' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Navn',
      type: 'string',
      group: 'agreement',
      description: 'Slik partneren skal stå på siden, for eksempel «Bilverksted AS».',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Adresse',
      type: 'slug',
      group: 'agreement',
      description: 'Siden får adressen egenberedskapsappen.no/for/<adresse>. Små bokstaver, tall og bindestrek.',
      options: { source: 'name', maxLength: 48 },
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return 'Adressen mangler';
          return SLUG_PATTERN.test(slug.current) || 'Bare små bokstaver (a–z), tall og bindestrek';
        }),
    }),
    defineField({
      name: 'agreementSigned',
      title: 'Avtale signert',
      type: 'boolean',
      group: 'agreement',
      description:
        'Siden lages bare når dette er på. Slå det på først når avtalen er signert av begge parter. ' +
        'Nettsiden må bygges på nytt før endringen vises.',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'agreementNote',
      title: 'Om avtalen',
      type: 'text',
      rows: 2,
      group: 'agreement',
      description: 'Hvem signerte, og når. Vises ikke på siden.',
      validation: (rule) =>
        rule.custom((note, context) =>
          context.document?.agreementSigned === true && !note?.trim()
            ? 'Skriv hvem som signerte og når før avtalen markeres som signert'
            : true,
        ),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'page',
      description: 'For lys bakgrunn. SVG er best; PNG går også. Vises 44 punkter høy.',
      options: { accept: 'image/svg+xml,image/png,image/webp' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logoDark',
      title: 'Logo for mørk bakgrunn',
      type: 'image',
      group: 'page',
      description: 'Vises når telefonen eller maskinen står i mørk modus, for eksempel en hvit utgave. Valgfri.',
      options: { accept: 'image/svg+xml,image/png,image/webp' },
    }),
    defineField({
      name: 'headline',
      title: 'Overskrift',
      type: 'string',
      group: 'page',
      description: 'For eksempel «Et tilbud til deg som er kunde hos Bilverksted AS».',
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: 'lead',
      title: 'Ingress',
      type: 'text',
      rows: 3,
      group: 'page',
      description: 'Teksten under overskriften. Ikke lov noe appen ikke gjør.',
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: 'description',
      title: 'Beskrivelse ved deling',
      type: 'text',
      rows: 2,
      group: 'page',
      description: 'Teksten som vises når lenken deles, i én eller to setninger.',
      validation: (rule) => rule.required().max(170),
    }),
    defineField({
      name: 'appGreeting',
      title: 'Hilsen i appen',
      type: 'string',
      group: 'page',
      description:
        'Én setning i kortet merket «Sponset» på Oversikt, for dem som lastet ned appen fra partnersiden (Android). ' +
        'Uten hilsen vises ikke kortet. Ikke lov noe appen ikke gjør.',
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'code',
      title: 'Kode',
      type: 'string',
      group: 'page',
      description:
        'Koden kunden skriver inn i appen, for eksempel «BILVERKSTED-2026». Uten kode vises ikke «Slik bruker du ' +
        'koden». Appen kan ikke ta imot koder ennå (LAUNCH.md).',
      validation: (rule) =>
        rule
          .min(4)
          .max(24)
          .custom((code) =>
            !code || CODE_PATTERN.test(code) ? true : 'Bare store bokstaver (A–Z), tall og bindestrek mellom delene',
          ),
    }),
    defineField({
      name: 'privacyLine',
      title: 'Hva partneren får vite',
      type: 'text',
      rows: 2,
      group: 'page',
      description:
        'For eksempel «Bilverksted AS får bare vite hvor mange som har tatt appen i bruk. De ser aldri hvem du er ' +
        'eller hva du legger inn.» Må stemme med avtalen.',
      validation: (rule) => rule.required().max(240),
    }),
  ],
  preview: {
    select: { title: 'name', slug: 'slug.current', signed: 'agreementSigned', media: 'logo' },
    prepare: ({ title, slug, signed, media }) => ({
      title,
      subtitle: `${signed ? 'Avtale signert' : 'Ikke signert, ingen side'} · /for/${slug ?? '…'}`,
      media,
    }),
  },
});
