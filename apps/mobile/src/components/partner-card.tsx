import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';

/**
 * The greeting from the partner whose page this phone was installed from (partner/use-partner-referral.ts).
 * Always marked «Sponset», only on Oversikt and never in Nødinfo, and the user can put it away for good.
 */
export function PartnerCard() {
  const { partner } = useData();
  const { setPartner } = useActions();
  // Android is always light (app.json); iOS follows the system.
  const dark = useColorScheme() === 'dark' && Platform.OS === 'ios';

  if (!partner || partner.hidden || !partner.greeting) return null;
  const { greeting } = partner;
  const hide = () => setPartner({ ...partner, hidden: true });

  return (
    <Card gap={10}>
      <View style={styles.top}>
        <Text style={styles.label}>SPONSET</Text>
        <Pressable onPress={hide} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Skjul hilsenen fra ${greeting.name}`}>
          <Text style={styles.hide}>Skjul</Text>
        </Pressable>
      </View>
      <Image
        source={{ uri: dark ? greeting.logoDark : greeting.logo }}
        style={styles.logo}
        contentFit="contain"
        contentPosition="left"
        accessibilityLabel={greeting.name}
      />
      <Text style={styles.greeting}>{greeting.greeting}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, color: Colors.secondaryLabel },
  hide: { fontSize: 15, color: Colors.accent },
  logo: { height: 32, width: '100%' },
  greeting: { fontSize: 16, lineHeight: 22, color: Colors.label },
});
