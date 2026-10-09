import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { AndroidKeyboardAvoiding } from '@/components/ui/keyboard-avoiding';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/**
 * A form presented as a sheet, as in the design: a round close button on the left, the
 * title in the middle and a round, filled save button on the right. Without `onSave` it's an
 * information sheet with just the close button.
 */
export function FormSheet({
  title,
  canSave,
  onSave,
  children,
}: {
  title: string;
  canSave?: boolean;
  onSave?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const android = Platform.OS === 'android';
  return (
    <AndroidKeyboardAvoiding>
      <ScrollView
        style={styles.root}
        // On iOS a page sheet starts below the status bar. On Android a modal is a full screen
        // drawn edge to edge, so the bar and the end of the form keep clear of the system bars.
        contentContainerStyle={[styles.content, android && { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={[styles.bar, android && { paddingTop: insets.top + 8 }]}>
          <RoundButton label="Lukk" icon={{ ios: 'xmark', android: 'close' }} onPress={() => router.back()} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {onSave ? (
            <RoundButton
              label="Lagre"
              icon={{ ios: 'checkmark', android: 'check' }}
              onPress={onSave}
              prominent
              disabled={!canSave}
            />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        {children}
      </ScrollView>
    </AndroidKeyboardAvoiding>
  );
}

function RoundButton({
  label,
  icon,
  onPress,
  prominent,
  disabled,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  prominent?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.round,
        prominent && !disabled && { backgroundColor: Colors.accent },
        pressed && { opacity: 0.7 },
      ]}>
      <Icon
        name={icon}
        size={16}
        color={prominent ? (disabled ? Colors.tertiaryLabel : '#FFFFFF') : Colors.label}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48, gap: 24 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.screen,
    paddingTop: 16,
  },
  title: { flex: 1, textAlign: 'center', fontFamily: Fonts.displaySemibold, fontSize: 17, color: Colors.label },
  spacer: { width: 44 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
  },
});
