import { EXPIRY_REMINDER_DAYS, type Reminder } from '@egenberedskap/core';

import { formatDate, formatDuration, listWords } from '@/lib/format';

const LEAD = formatDuration(EXPIRY_REMINDER_DAYS);

export type ReminderMessage = { title: string; body: string; url: string };

/** What each reminder says, and where tapping it leads. */
export function reminderMessage(reminder: Reminder): ReminderMessage {
  switch (reminder.kind) {
    case 'expiring': {
      const when = formatDate(reminder.expiresOn);
      const [first, ...rest] = reminder.items;
      if (rest.length === 0) {
        return {
          title: `Går ut om ${LEAD}`,
          body: `${first!.name} går ut ${when}. Bytt det ut, så teller det fortsatt.`,
          url: `/lager/vare/${encodeURIComponent(first!.id)}`,
        };
      }
      return {
        title: `${reminder.items.length} varer går ut om ${LEAD}`,
        body: `${listNames(reminder.items.map((item) => item.name))} går ut ${when}.`,
        url: '/lager',
      };
    }
    case 'check':
      return {
        title: 'Fremdeles beredt?',
        body: 'Tid for beredskapssjekk. Fire raske spørsmål holder tallet riktig, og det tar omtrent fem minutter.',
        url: '/beredskapssjekk',
      };
    case 'expiryReview':
      return {
        title: 'Gå gjennom utløpsdatoer',
        body: 'Du ba om en påminnelse i beredskapssjekken.',
        url: '/lager',
      };
  }
}

/** "a", "a og b", "a, b og c", "a, b og 3 til" */
function listNames(names: string[]): string {
  const shown = names.length > 3 ? [...names.slice(0, 2), `${names.length - 2} til`] : names;
  return listWords(shown);
}
