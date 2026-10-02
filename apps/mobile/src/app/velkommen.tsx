import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountField, TextField } from '@/components/form/fields';
import { PrimaryButton } from '@/components/ui/button';
import { Section } from '@/components/ui/list';
import { Colors, Spacing } from '@/constants/theme';
import { useActions } from '@/data/data-provider';

/** First launch. Three answers are enough to work out the household's numbers. */
export default function Velkommen() {
  const { completeOnboarding } = useActions();
  const [name, setName] = useState('');
  const [people, setPeople] = useState(2);
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const ready = name.trim() !== '' && address.trim() !== '' && !saving;

  const start = async () => {
    setSaving(true);
    try {
      await completeOnboarding({ name, people, address });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.intro}>
          <Text style={styles.title}>Velkommen</Text>
          <Text style={styles.lead}>
            Se hvor lenge husstanden klarer seg uten strøm og vann, og hva som mangler for å nå DSBs anbefaling på en
            uke.
          </Text>
        </View>

        <Section footer="Alt lagres bare på denne telefonen.">
          <TextField label="Fornavn" value={name} onChange={setName} placeholder="Kari" textContentType="name" autoCapitalize="words" />
          <CountField label="Personer i husstanden" value={people} onChange={setPeople} />
          <TextField
            label="Adresse"
            value={address}
            onChange={setAddress}
            placeholder="Storgata 12"
            textContentType="fullStreetAddress"
            autoCapitalize="words"
          />
        </Section>

        <PrimaryButton label="Kom i gang" onPress={start} disabled={!ready} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 48, paddingBottom: 32, gap: 28 },
  intro: { paddingHorizontal: Spacing.screen + 4, gap: 10 },
  title: { fontSize: 34, fontWeight: '700', color: Colors.label },
  lead: { fontSize: 17, lineHeight: 24, color: Colors.secondaryLabel },
});
