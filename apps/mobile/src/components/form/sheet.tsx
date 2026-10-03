import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Spacing } from '@/constants/theme';

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
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.bar}>
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
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: Colors.label },
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
