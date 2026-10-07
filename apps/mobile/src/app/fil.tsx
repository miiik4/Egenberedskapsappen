import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PrimaryButton } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useActions, useData } from '@/data/data-provider';
import { deleteStoredFiles, isPdf, storedFile } from '@/documents/files';
import { DocumentGate } from '@/documents/lock';
import { useDocumentFiles } from '@/documents/use-documents';
import { Text } from '@/components/ui/text';

/**
 * One file, full screen: a document's, behind the document lock, or a belonging's receipt.
 * Photos can be pinched to zoom, for reading small print.
 */
export default function FileViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, belongings } = useData();
  const document = documents.find((d) => d.files.some((f) => f.id === id));
  const docFile = document?.files.find((f) => f.id === id);
  const { removeFile } = useDocumentFiles();
  const { removeBelongingFile } = useActions();

  if (document && docFile) {
    return (
      <DocumentGate dark>
        <Viewer
          title={document.name}
          fileName={docFile.fileName}
          mimeType={docFile.mimeType}
          removeQuestion={`Den blir slettet fra ${document.name}.`}
          onRemove={() => removeFile(docFile)}
        />
      </DocumentGate>
    );
  }

  const belonging = belongings.find((b) => b.receipt?.id === id || b.photo?.id === id);
  const file = belonging && (belonging.receipt?.id === id ? belonging.receipt : belonging.photo);
  if (!belonging || !file) return null;
  return (
    <Viewer
      title={belonging.name}
      fileName={file.fileName}
      mimeType={file.mimeType}
      removeQuestion={`Den blir slettet fra ${belonging.name}.`}
      onRemove={async () => deleteStoredFiles(await removeBelongingFile(file.id))}
    />
  );
}

function Viewer({
  title,
  fileName,
  mimeType,
  removeQuestion,
  onRemove,
}: {
  title: string;
  fileName: string;
  mimeType: string;
  removeQuestion: string;
  onRemove: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const stored = storedFile(fileName);
  const pdf = isPdf(mimeType);
  const share = () => Sharing.shareAsync(stored.uri, { mimeType, dialogTitle: title });
  const remove = () =>
    Alert.alert('Slette filen?', removeQuestion, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await onRemove();
        },
      },
    ]);

  return (
    <View style={styles.root}>
      {pdf && Platform.OS === 'ios' ? (
        // WKWebView renders PDFs natively; it may only read inside the app's documents folder.
        <WebView
          source={{ uri: stored.uri }}
          originWhitelist={['file://*']}
          allowingReadAccessToURL={stored.uri.slice(0, stored.uri.lastIndexOf('/') + 1)}
          style={[styles.pdf, { marginTop: insets.top + 56 }]}
        />
      ) : pdf ? (
        // Android's WebView can't show PDFs, so hand the file to a PDF app instead.
        <View style={styles.center}>
          <Text style={styles.note}>PDF-en åpnes i en annen app på telefonen.</Text>
          <PrimaryButton label="Åpne PDF" onPress={share} />
        </View>
      ) : (
        <ScrollView
          maximumZoomScale={5}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.zoom}>
          <Image source={{ uri: stored.uri }} style={styles.image} contentFit="contain" accessibilityLabel={title} />
        </ScrollView>
      )}

      <View style={[styles.bar, { top: insets.top + 6 }]}>
        <BarButton label="Lukk" icon={{ ios: 'xmark', android: 'close' }} onPress={() => router.back()} />
        <View style={styles.spacer} />
        <BarButton label="Del" icon={{ ios: 'square.and.arrow.up', android: 'share' }} onPress={share} />
        <BarButton label="Slett" icon={{ ios: 'trash', android: 'delete' }} onPress={remove} />
      </View>
    </View>
  );
}

function BarButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={17} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  zoom: { flexGrow: 1, justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  pdf: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  note: { color: '#FFFFFF', fontSize: 17, textAlign: 'center', marginHorizontal: 32 },
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  spacer: { flex: 1 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
