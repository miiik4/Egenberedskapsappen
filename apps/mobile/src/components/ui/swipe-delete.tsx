import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Colors } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** A list row that slides left to show one action, as in Mail and Reminders. */
export function SwipeAction({
  children,
  onAction,
  text,
  accessibilityLabel,
  color,
  width = 88,
  background = Colors.card,
}: {
  children: ReactNode;
  onAction: () => void;
  /** On the button: «Slett». */
  text: string;
  accessibilityLabel: string;
  color: ColorValue;
  width?: number;
  /** What the row lies on, seen behind it as it slides. */
  background?: ColorValue;
}) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={{ backgroundColor: background }}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          onPress={() => {
            swipeable.close();
            onAction();
          }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={[styles.action, { width, backgroundColor: color }]}>
          <Text style={styles.text}>{text}</Text>
        </Pressable>
      )}>
      {children}
    </Swipeable>
  );
}

/** A list row that slides left to show «Slett». */
export function SwipeToDelete({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  return (
    <SwipeAction onAction={onDelete} text="Slett" accessibilityLabel={`Slett ${label}`} color={Colors.destructive}>
      {children}
    </SwipeAction>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
