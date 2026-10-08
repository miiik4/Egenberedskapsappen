import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
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
          {guide.sponsored && (
            <View style={styles.sponsoredCard}>
              <View style={styles.sponsoredHeader}>
                <Pill label="Sponset" tone="neutral" />
                <Text style={styles.sponsoredPartner}>{guide.sponsored.partner}</Text>
              </View>
              <Text style={styles.sponsoredTitle}>{guide.sponsored.title}</Text>
              <Text style={styles.sponsoredText}>{guide.sponsored.text}</Text>
              {guide.sponsored.url && (
                <Pressable
                  onPress={() => guide.sponsored?.url && Linking.openURL(guide.sponsored.url)}
                  accessibilityRole="link"
                  hitSlop={8}
                  style={styles.sponsoredButton}>
                  <Text style={styles.sponsoredButtonText}>{guide.sponsored.urlLabel ?? 'Les mer'}</Text>
                </Pressable>
              )}
            </View>
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
  sponsoredCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  sponsoredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sponsoredPartner: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  sponsoredTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.label,
  },
  sponsoredText: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.label,
  },
  sponsoredButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    backgroundColor: Colors.accentSoft,
  },
  sponsoredButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
});
