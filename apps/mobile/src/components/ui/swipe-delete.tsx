import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Colors } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** A list row that slides left to show «Slett», as in Mail and Reminders. */
export function SwipeToDelete({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.container}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          onPress={() => {
            swipeable.close();
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Slett ${label}`}
          style={styles.action}>
          <Text style={styles.text}>Slett</Text>
        </Pressable>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.card },
  action: { width: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.destructive },
  text: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
