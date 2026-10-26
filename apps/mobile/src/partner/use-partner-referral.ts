import { parsePartnerGreeting, partnerFromReferrer, type PartnerGreeting } from '@egenberedskap/core';
import * as Application from 'expo-application';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useActions, useData } from '@/data/data-provider';

/** Our own site, built from Sanity (apps/web/src/pages/partnere). Nothing else is asked. */
const GREETING_URL = (slug: string) => `https://egenberedskapappen.no/partnere/${slug}.json`;

/** Play's referrer service can hang; a first launch doesn't wait on it. */
const REFERRER_TIMEOUT_MS = 10_000;

/**
 * The partner slug Play handed over at install, null when there's none, or undefined when it couldn't be read
 * this time (try again next launch). Play keeps the referrer for a while after install, not forever.
 */
async function readReferrer(): Promise<string | null | undefined> {
  try {
    const referrer = await Promise.race([
      Application.getInstallReferrerAsync(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), REFERRER_TIMEOUT_MS)),
    ]);
    return partnerFromReferrer(referrer);
  } catch (error) {
    // No Play Store, or one too old to have the service: there will never be a referrer on this phone.
    if ((error as { code?: string })?.code === 'ERR_APPLICATION_INSTALL_REFERRER_UNAVAILABLE') return null;
    return undefined;
  }
}

/** Null when the partner has no greeting (yet), or anything else is off; the card then just isn't shown. */
async function fetchGreeting(slug: string): Promise<PartnerGreeting | null> {
  try {
    const response = await fetch(GREETING_URL(slug), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return parsePartnerGreeting(slug, await response.json());
  } catch {
    return null;
  }
}

/**
 * Android installs from a partner's page (egenberedskapappen.no/for/<slug>) show that partner's greeting on
 * Oversikt, marked «Sponset», with nothing to type. The referrer is read once, on the phone; the only request
 * is for the partner's greeting from our own site, and nothing about the user goes with it. iPhone has no
 * install referrer, so this does nothing there.
 */
export function usePartnerReferral() {
  const { partner, partnerReferrerRead } = useData();
  const { setPartner, markPartnerReferrerRead } = useActions();

  useEffect(() => {
    if (Platform.OS !== 'android' || partnerReferrerRead) return;
    let live = true;
    (async () => {
      const slug = await readReferrer();
      if (!live || slug === undefined) return;
      if (slug) await setPartner({ slug, greeting: null, hidden: false });
      await markPartnerReferrerRead();
    })();
    return () => {
      live = false;
    };
  }, [partnerReferrerRead, setPartner, markPartnerReferrerRead]);

  // The greeting comes from the network, so try again whenever the app comes back until it's there.
  const slug = partner?.slug;
  const missing = partner !== null && partner.greeting === null;
  const hidden = partner?.hidden ?? false;
  useEffect(() => {
    if (!slug || !missing) return;
    let live = true;
    const load = async () => {
      const greeting = await fetchGreeting(slug);
      if (live && greeting) await setPartner({ slug, greeting, hidden });
    };
    load();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && load());
    return () => {
      live = false;
      subscription.remove();
    };
  }, [slug, missing, hidden, setPartner]);
}
