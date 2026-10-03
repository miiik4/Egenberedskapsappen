import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { IconTile, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { isPdf, storedFile } from '@/documents/files';
import { DocumentGate } from '@/documents/lock';
import { useDocumentFiles, type Source } from '@/documents/use-documents';

const SOURCES: { source: Source; title: string; icon: IconName; color: string }[] = [
  { source: 'camera', title: 'Ta bilde', icon: { ios: 'camera.fill', android: 'photo_camera' }, color: '#5E5CE6' },
  { source: 'photos', title: 'Velg fra bilder', icon: { ios: 'photo.fill', android: 'image' }, color: '#FF9F0A' },
  { source: 'files', title: 'Velg fil', icon: { ios: 'folder.fill', android: 'folder' }, color: '#0A84FF' },
];

export default function DocumentPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useData().documents.find((d) => d.id === id);
  const { addFrom, removeDocument } = useDocumentFiles();
  const [adding, setAdding] = useState(false);

  // Gone, e.g. just deleted: nothing to show while the stack pops back.
  if (!document) return null;

  const add = async (source: Source) => {
    setAdding(true);
    try {
      await addFrom(document.id, source);
    } catch (error) {
      console.error('Could not add file', error);
      Alert.alert('Kunne ikke legge til filen', 'Prøv igjen, eller velg en annen fil.');
    } finally {
      setAdding(false);
    }
  };

  const remove = () =>
    Alert.alert('Slette dokumentet?', `${document.name} og filene blir slettet fra telefonen.`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await removeDocument(document.id);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: document.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ToolbarIcons.more}>
          <Stack.Toolbar.MenuAction
            icon="pencil"
            onPress={() => router.push({ pathname: '/dokument', params: { id: document.id } })}>
            Gi nytt navn
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={remove}>
            Slett dokument
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <DocumentGate>
        <Screen>
          {document.files.length > 0 ? (
            <View style={styles.grid}>
              {document.files.map((file, i) => (
                <Pressable
                  key={file.id}
                  onPress={() => router.push({ pathname: '/fil', params: { id: file.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${isPdf(file.mimeType) ? 'PDF' : 'Bilde'} ${i + 1} av ${document.files.length}`}
                  style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
                  {isPdf(file.mimeType) ? (
                    <View style={styles.pdf}>
                      <Icon name={{ ios: 'doc.richtext', android: 'picture_as_pdf' }} size={34} color={Colors.destructive} />
                      <Text style={styles.pdfLabel}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: storedFile(file.fileName).uri }} style={styles.image} contentFit="cover" />
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              Ta bilde av dokumentet, eller legg til en PDF. Alt lagres på telefonen og kan åpnes uten nett.
            </Text>
          )}

          <Section header="Legg til" separatorInset={60}>
            {SOURCES.map(({ source, title, icon, color }) => (
              <Row
                key={source}
                title={title}
                leading={<IconTile name={icon} color={color} />}
                onPress={adding ? undefined : () => add(source)}
              />
            ))}
          </Section>
          {adding && <ActivityIndicator />}
        </Screen>
      </DocumentGate>
    </>
  );
}

const TILE_GAP = 10;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP, marginHorizontal: Spacing.screen },
  tile: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  image: { flex: 1 },
  pdf: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  pdfLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondaryLabel },
  empty: { marginHorizontal: Spacing.screen + 4, fontSize: 17, lineHeight: 23, color: Colors.secondaryLabel },
});
