import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

/**
 * Keeps what it wraps above the keyboard on Android. `automaticallyAdjustKeyboardInsets` on a
 * ScrollView is iOS-only, and drawn edge to edge Android doesn't resize the window for the
 * keyboard, so there the content shrinks above it instead and a focused field stays in view.
 * On iOS the children render as they are.
 */
export function AndroidKeyboardAvoiding({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'android') return children;
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
