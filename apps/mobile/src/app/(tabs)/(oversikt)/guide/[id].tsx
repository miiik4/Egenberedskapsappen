import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { GUIDES } from '@/guides/guides';
import { Text } from '@/components/ui/text';

export default function Guide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = Object.values(GUIDES).find((g) => g.id === id);
  if (!guide) return null;

  return (
    <>
      <Stack.Screen options={{ title: guide.title, headerLargeTitleEnabled: false }} />
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>{guide.title}</Text>
          <Text style={styles.meta}>{guide.minutes} min</Text>
          {guide.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.points.map((point) => (
                <View key={point} style={styles.point}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.text}>{point}</Text>
                </View>
              ))}
            </View>
          ))}
          {guide.link && (
            <Pressable
              onPress={() => guide.link && Linking.openURL(guide.link.url)}
              accessibilityRole="link"
              hitSlop={8}
              style={styles.link}>
              <Text style={styles.linkText}>{guide.link.label}</Text>
            </Pressable>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { marginHorizontal: Spacing.screen + 4, gap: 8 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, color: Colors.label },
  meta: { fontSize: 15, color: Colors.secondaryLabel },
  section: { gap: 8, marginTop: 16 },
  heading: { fontSize: 20, fontWeight: '600', color: Colors.label },
  point: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 17, lineHeight: 24, color: Colors.secondaryLabel },
  text: { flex: 1, fontSize: 17, lineHeight: 24, color: Colors.label },
  link: { alignSelf: 'flex-start', marginTop: 20 },
  linkText: { fontSize: 17, fontWeight: '600', color: Colors.accent },
});
