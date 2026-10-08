import { planReminders } from '@egenberedskap/core';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useData } from '@/data/data-provider';
import { todayIso } from '@/lib/format';

import { ensureAndroidChannel, replaceScheduledReminders } from './scheduler';

export type Permission = 'granted' | 'undetermined' | 'denied';

type NotificationsContextValue = {
  permission: Permission | null;
  /** Shows the system prompt. Only call it right after the user asked for reminders. */
  requestPermission: () => Promise<Permission>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function toPermission(status: Notifications.NotificationPermissionsStatus): Permission {
  const provisional = status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (status.granted || provisional) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Keeps the phone's scheduled reminders in step with the data, and opens the right screen
 * when one is tapped. Never asks for permission on its own: the user does that from Home or
 * the beredskapssjekk, where it's clear what the reminders are for.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [permission, setPermission] = useState<Permission | null>(null);

  // Check on launch and whenever the app comes back, in case it was changed in Settings.
  useEffect(() => {
    let live = true;
    const refresh = () =>
      Notifications.getPermissionsAsync().then((status) => live && setPermission(toPermission(status)));
    refresh();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    await ensureAndroidChannel();
    const next = toPermission(await Notifications.requestPermissionsAsync());
    setPermission(next);
    return next;
  }, []);

  // Reschedule after every change. Runs are chained so two quick edits can't interleave
  // one run's cancel with the other's scheduling.
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    if (permission !== 'granted' || !data.onboarded) return;
    const plan = planReminders({
      items: data.stock,
      lastCheck: data.lastCheck ?? data.onboardedOn ?? todayIso(),
      checkIntervalMonths: data.checkIntervalMonths,
      expiryReviewOn: data.expiryReviewOn,
      today: todayIso(),
    });
    queue.current = queue.current
      .then(() => replaceScheduledReminders(plan))
      .catch((error) => console.error('Could not schedule reminders', error));
  }, [permission, data]);

  // Tapping a reminder opens what it's about, whether the app was running or not.
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as Href);
    };
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);

  return <NotificationsContext value={{ permission, requestPermission }}>{children}</NotificationsContext>;
}

export function useNotifications(): NotificationsContextValue {
  const value = use(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return value;
}
