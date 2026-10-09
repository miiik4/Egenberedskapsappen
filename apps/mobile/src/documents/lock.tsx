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
  /** How the user unlocks, for button text: «Face ID», «Touch ID» or «kode». Null if the phone has no lock. */
  method: string | null;
  unlock: () => Promise<boolean>;
};

const LockContext = createContext<LockContextValue | null>(null);

async function unlockMethod(): Promise<string | null> {
  if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return null;
  if (!(await LocalAuthentication.isEnrolledAsync())) return 'kode';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  return Platform.OS === 'ios' ? 'kode' : 'fingeravtrykk';
}

/**
 * Documents unlock with Face ID, Touch ID or the phone's code, and lock again as soon as the
 * app goes to the background. A phone with no lock at all can't protect them this way, so
 * they stay open there and the household sheet says so.
 */
export function DocumentLockProvider({ children }: { children: ReactNode }) {
  const { documentLock } = useData();
  const [unlocked, setUnlocked] = useState(false);
  const [method, setMethod] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const check = () => unlockMethod().then((m) => live && setMethod(m));
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      // Only a real trip to the background locks: the Face ID prompt itself makes the app
      // briefly «inactive», and locking then would undo the unlock it's in the middle of.
      if (state === 'background') setUnlocked(false);
      if (state === 'active') check();
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

  return <LockContext value={{ locked, method: method ?? null, unlock }}>{children}</LockContext>;
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
  const { locked, method, unlock } = useDocumentLock();
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
      <PrimaryButton label={method ? `Lås opp med ${method}` : 'Lås opp'} onPress={unlock} />
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
