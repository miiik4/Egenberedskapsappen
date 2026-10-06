import { featuredGuide } from '@egenberedskap/core';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { GUIDE_LIST, GUIDES, type Guide } from '@/guides/guides';
import { todayIso } from '@/lib/format';

const open = (guide: Guide) => router.push({ pathname: '/guide/[id]', params: { id: guide.id } });

/** One guide picked for the season and household, then a short list. */
export default function Guider() {
  const { household } = useData();
  const featured = GUIDES[featuredGuide(household, Number(todayIso().slice(5, 7)))];

  return (
    <>
      <Stack.Screen options={{ title: 'Guider' }} />
      <Screen>
        <Pressable
          onPress={() => open(featured)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.featured, pressed && { opacity: 0.8 }]}>
          <Text style={styles.eyebrow}>AKTUELT NÅ</Text>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.meta}>{featured.minutes} min · Passer for husstanden din</Text>
        </Pressable>

        <Section header="Kom i gang">
          {GUIDE_LIST.filter((g) => g.id !== featured.id).map((guide) => (
            <Row key={guide.id} title={guide.title} subtitle={`${guide.minutes} min`} chevron onPress={() => open(guide)} />
          ))}
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  featured: {
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 4,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: Colors.accent },
  featuredTitle: { fontSize: 22, fontWeight: '700', lineHeight: 27, color: Colors.label },
  meta: { fontSize: 15, color: Colors.secondaryLabel },
});
