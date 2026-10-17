import { useEffect, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';

/**
 * Keeps what it wraps above the keyboard on Android. `automaticallyAdjustKeyboardInsets` on a
 * ScrollView is iOS-only, and drawn edge to edge Android doesn't resize the window for the
 * keyboard, so there the content shrinks above it instead and a focused field stays in view.
 * On iOS the children render as they are.
 */
export function AndroidKeyboardAvoiding({ children }: { children: ReactNode }) {
  useBlurOnKeyboardHide();
  if (Platform.OS !== 'android') return children;
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      {children}
    </KeyboardAvoidingView>
  );
}

/**
 * On Android the Back button hides the keyboard but leaves the field focused, and pressing a
 * field that's still focused doesn't always bring the keyboard back (seen on a OnePlus 6).
 * Blurring it as the keyboard goes makes the next press a fresh focus. On iOS the keyboard
 * only goes when the field blurs, so there's nothing to do.
 */
function useBlurOnKeyboardHide() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      // Moving between fields with different keyboards can hide and show it again in one go;
      // only a keyboard that stays hidden means the user put it away.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Keyboard.isVisible()) return;
        const focused = TextInput.State.currentlyFocusedInput();
        if (focused) TextInput.State.blurTextInput(focused);
      }, 100);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
