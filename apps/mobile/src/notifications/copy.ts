import type { Reminder } from '@egenberedskap/core';

import { formatDate } from '@/lib/format';

export type ReminderMessage = { title: string; body: string; url: string };

/**
 * What each reminder says, and where tapping it leads. Reminders show on the lock screen, so they never name an item
 * (it could be a medicine); the text and the data payload carry only a count, a date and an id.
 */
export function reminderMessage(reminder: Reminder): ReminderMessage {
  switch (reminder.kind) {
    case 'expiring': {
      const when = formatDate(reminder.expiresOn);
      const [first, ...rest] = reminder.items;
      if (first && rest.length === 0) {
        return {
          title: 'Noe i beredskapslageret går snart ut',
          body: `Én vare går ut ${when}. Bytt den ut, så teller den fortsatt.`,
          url: `/lager/vare/${encodeURIComponent(first.id)}`,
        };
      }
      return {
        title: `${reminder.items.length} varer går snart ut`,
        body: `De går ut ${when}. Bytt dem ut, så teller de fortsatt.`,
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

