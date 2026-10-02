import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';

/** The papers people most often need in a hurry. */
const SUGGESTIONS = ['Pass', 'Førerkort', 'Resepter og medisinliste', 'Forsikringsbevis', 'Skjøte', 'Fødselsattest'];

/** Name a new document, or rename one. Files are added on the document's own page. */
export default function Dokument() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { documents } = useData();
  const { saveDocument } = useActions();
  const existing = documents.find((d) => d.id === id);
  const [name, setName] = useState(existing?.name ?? '');

  const save = async () => {
    const savedId = await saveDocument({ id: existing?.id, name });
    router.back();
    // A new document opens straight away, ready for its first file.
    if (!existing) router.push({ pathname: '/dokumenter/[id]', params: { id: savedId } });
  };

  return (
    <FormSheet title={existing ? 'Gi nytt navn' : 'Nytt dokument'} canSave={name.trim() !== ''} onSave={save}>
      <Section footer="Du legger til bilder eller PDF-er i neste steg.">
        <TextField label="Navn" value={name} onChange={setName} placeholder="Pass, Kari og Ola" autoFocus={!existing} />
      </Section>
      {!existing && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Pill key={s} label={s} tone="accent" onPress={() => setName(s)} />
          ))}
        </View>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: Spacing.screen + Spacing.rowInset - 4,
    marginTop: -8,
  },
});
