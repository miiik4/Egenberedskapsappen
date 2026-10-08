import type { IsoDate, Reminder } from '@egenberedskap/core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderMessage } from './copy';

/** Reminders arrive mid-morning, when there's time to act on them the same day. */
export const REMINDER_HOUR = 10;

const ANDROID_CHANNEL = 'reminders';

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Påminnelser',
    description: 'Når noe i beredskapslageret går ut, og når det er tid for beredskapssjekk',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function at(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, REMINDER_HOUR);
}

/**
 * Replaces whatever is scheduled with `plan`. Rebuilding from scratch every time keeps the
 * phone's schedule an exact copy of the data, with nothing stale left behind.
 */
export async function replaceScheduledReminders(plan: Reminder[], now = new Date()) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of plan) {
    const date = at(reminder.on);
    // Today's reminder is only worth sending if its hour hasn't passed yet.
    if (date <= now) continue;
    const { title, body, url } = reminderMessage(reminder);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL }),
      },
    });
  }
}
