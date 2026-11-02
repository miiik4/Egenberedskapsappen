import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AndroidKeyboardAvoiding } from '@/components/ui/keyboard-avoiding';
import { Colors } from '@/constants/theme';

/**
 * Scrolling body for a tab screen. `automatic` insets let the native large title collapse
 * and keep content clear of the floating tab bar. A screen with text fields takes `keyboard`,
 * so the field being typed in stays above the keyboard and a tap elsewhere lands.
 */
export function Screen({ children, keyboard }: { children: ReactNode; keyboard?: boolean }) {
  const body = (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps={keyboard ? 'handled' : undefined}
      automaticallyAdjustKeyboardInsets={keyboard}
    >
      {children}
    </ScrollView>
  );
  return keyboard ? <AndroidKeyboardAvoiding>{body}</AndroidKeyboardAvoiding> : body;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 8, paddingBottom: 32, gap: 24 },
});
