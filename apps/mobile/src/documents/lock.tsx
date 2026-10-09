import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { createContext, use, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { Text } from '@/components/ui/text';

type LockContextValue = {
  /** True while documents must stay hidden. */
  locked: boolean;
  /**
   * How the user unlocks, for text such as «Dokumentene krever … for å åpnes»: «Face ID», «Touch ID»,
   * «kode», or on Android «ansiktsgjenkjenning», «fingeravtrykk» or «biometri eller kode».
   * Null if the phone has no lock.
   */
  method: string | null;
  /** The unlock button's label. */
  unlockLabel: string;
  unlock: () => Promise<boolean>;
};

const LockContext = createContext<LockContextValue | null>(null);

type UnlockMethod = { method: string; label: string };

const withMethod = (method: string): UnlockMethod => ({ method, label: `Lås opp med ${method}` });

async function unlockMethod(): Promise<UnlockMethod | null> {
  if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return null;
  if (!(await LocalAuthentication.isEnrolledAsync())) return withMethod('kode');
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const fingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (Platform.OS === 'ios') {
    if (face) return withMethod('Face ID');
    if (fingerprint) return withMethod('Touch ID');
    return withMethod('kode');
  }
  // Android reports the sensors the phone has, not which one is set up, and the prompt also
  // takes the PIN. Name a sensor only when it's the only kind; otherwise stay neutral.
  if (face && !fingerprint) return { method: 'ansiktsgjenkjenning', label: 'Lås opp med ansiktet' };
  if (fingerprint && !face) return { method: 'fingeravtrykk', label: 'Lås opp med fingeravtrykk' };
  return { method: 'biometri eller kode', label: 'Lås opp' };
}

/**
 * Expected external activity (Android only).
 *
 * On Android the camera, the photo picker, the file picker, the share sheet and even the camera
 * permission dialog are separate activities, so React Native reports `background` when they
 * open, and documents would lock and ask for biometrics again on the way back.
 * `withExternalActivity()` opens a window just before launching one of them. A trip to the
 * background inside the window doesn't lock, but:
 * - the window closes as soon as the call returns (the picker or sheet is closed), so leaving
 *   the app afterwards (home, app switch) locks as usual. It isn't closed on `active`: asking
 *   for the camera permission is its own trip out and back before the camera opens;
 * - the window lasts at most EXTERNAL_ACTIVITY_MS from when it opened. If the app comes back
 *   later than that (say the user pressed home while in the picker and came back much later),
 *   it locks on return. JS timers stop in the background, so this is checked on return.
 * The documents stay mounted while the picker is open, so FLAG_SECURE stays on throughout.
 * On iOS these pickers and sheets run inside the app, so nothing changes there.
 */
const EXTERNAL_ACTIVITY_MS = 2 * 60_000;

let externalActivity: { token: object; until: number } | null = null;

export async function withExternalActivity<T>(launch: () => Promise<T>): Promise<T> {
  if (Platform.OS !== 'android') return launch();
  const token = {};
  externalActivity = { token, until: Date.now() + EXTERNAL_ACTIVITY_MS };
  try {
    return await launch();
  } finally {
    if (externalActivity?.token === token) externalActivity = null;
  }
}

/**
 * Documents unlock with Face ID, Touch ID or the phone's code, and lock again as soon as the
 * app goes to the background. A phone with no lock at all can't protect them this way, so
 * they stay open there and the household sheet says so.
 */
export function DocumentLockProvider({ children }: { children: ReactNode }) {
  const { documentLock } = useData();
  const [unlocked, setUnlocked] = useState(false);
  const [method, setMethod] = useState<UnlockMethod | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    // The time a lock was skipped for an expected external activity (see withExternalActivity).
    let skippedLockUntil: number | null = null;
    const check = () => unlockMethod().then((m) => live && setMethod(m));
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      // Only a real trip to the background locks: the Face ID prompt itself makes the app
      // briefly «inactive», and locking then would undo the unlock it's in the middle of.
      if (state === 'background') {
        if (externalActivity && Date.now() < externalActivity.until) {
          skippedLockUntil = externalActivity.until;
        } else {
          setUnlocked(false);
        }
      }
      if (state === 'active') {
        if (skippedLockUntil !== null && Date.now() >= skippedLockUntil) setUnlocked(false);
        skippedLockUntil = null;
        check();
      }
    });
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Lås opp dokumentene',
      cancelLabel: 'Avbryt',
      fallbackLabel: 'Bruk kode',
    });
    if (result.success) setUnlocked(true);
    return result.success;
  }, []);

  // Until the phone's lock has been checked, err on the side of locked.
  const locked = documentLock && method !== null && !unlocked;

  return (
    <LockContext value={{ locked, method: method?.method ?? null, unlockLabel: method?.label ?? 'Lås opp', unlock }}>
      {children}
    </LockContext>
  );
}

export function useDocumentLock(): LockContextValue {
  const value = use(LockContext);
  if (!value) throw new Error('useDocumentLock must be used inside <DocumentLockProvider>');
  return value;
}

/**
 * Shows its children only while documents are unlocked, and asks to unlock straight away.
 * While a gate is on screen, the app is also kept out of the app switcher, screenshots on
 * Android and screen recordings: locked or not, so that locking on the way to the background
 * never lifts the protection at the moment the system takes its snapshot.
 */
export function DocumentGate({ children, dark }: { children: ReactNode; dark?: boolean }) {
  const { locked, unlockLabel, unlock } = useDocumentLock();
  const asked = useRef(false);
  useScreenProtection();

  useEffect(() => {
    if (locked && !asked.current) {
      asked.current = true;
      unlock();
    }
    if (!locked) asked.current = false;
  }, [locked, unlock]);

  if (!locked) return children;

  return (
    <View style={[styles.locked, dark && styles.dark]}>
      <Icon name={{ ios: 'lock.fill', android: 'lock' }} size={40} color={dark ? '#FFFFFF' : Colors.secondaryLabel} />
      <Text style={[styles.title, dark && { color: '#FFFFFF' }]}>Dokumentene er låst</Text>
      <PrimaryButton label={unlockLabel} onPress={unlock} />
    </View>
  );
}

/** How many mounted screens want protection. The blur over the app switcher is one switch for the whole app. */
let protectedScreens = 0;

/**
 * Keeps this screen out of the app switcher (iOS), recents, screenshots (Android) and screen
 * recordings while it's mounted. Each screen counts on its own: closing a file on top of a
 * document must not lift the protection the document page under it still needs.
 */
export function useScreenProtection() {
  // A key per screen: expo-screen-capture allows capture again once no key is left.
  ScreenCapture.usePreventScreenCapture(`documents-${useId()}`);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (protectedScreens++ === 0) ScreenCapture.enableAppSwitcherProtectionAsync(1);
    return () => {
      if (--protectedScreens === 0) ScreenCapture.disableAppSwitcherProtectionAsync();
    };
  }, []);
}

const styles = StyleSheet.create({
  locked: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 80,
    backgroundColor: Colors.background,
  },
  dark: { backgroundColor: '#000000' },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.label,
    marginHorizontal: Spacing.screen,
  },
});
