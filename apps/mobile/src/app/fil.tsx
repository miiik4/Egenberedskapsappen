import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { clamp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PrimaryButton } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useActions, useData } from '@/data/data-provider';
import { deleteStoredFiles, isPdf, storedFile } from '@/documents/files';
import { DocumentGate, withExternalActivity } from '@/documents/lock';
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
  // Only a file that is a PDF by name goes into the web view, which would run anything else as a page.
  const pdf = isPdf(mimeType) && fileName.endsWith('.pdf');
  // The share sheet leaves the app on Android; don't relock the document for it.
  const share = () => withExternalActivity(() => Sharing.shareAsync(stored.uri, { mimeType, dialogTitle: title }));
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
        // Android's WebView can't show PDFs, and opening one in a viewer (ACTION_VIEW) needs a
        // native module the app doesn't have yet (see docs/android-review.md 3.4). Until then it
        // goes through the share sheet, which also lists apps that send it on, so say so.
        <View style={styles.center}>
          <Text style={styles.note}>
            PDF-en kan ikke vises her. Velg en PDF-leser i listen for å åpne den. Listen viser også apper som sender den videre.
          </Text>
          <PrimaryButton label="Del eller åpne PDF-en" onPress={share} />
        </View>
      ) : (
        <Zoomable>
          {/* Memory only: a disk cache would keep a copy outside dokumenter/, after the file is deleted. */}
          <Image
            source={{ uri: stored.uri }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory"
            accessibilityLabel={title}
          />
        </Zoomable>
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

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;

/** Pinch to zoom, drag to move and double-tap to zoom in or out. */
function Zoomable({ children }: { children: ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <ScrollView
        maximumZoomScale={MAX_ZOOM}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.zoom}>
        {children}
      </ScrollView>
    );
  }
  return <GestureZoom>{children}</GestureZoom>;
}

/**
 * The ScrollView zoom props are iOS-only, so Android zooms with gesture-handler and Reanimated.
 * Positions are measured from the centre of the view: a point q of the content is on screen at
 * offset + scale × q, and the content can't be dragged further than its edges.
 */
function GestureZoom({ children }: { children: ReactNode }) {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      start.set({
        scale: scale.get(),
        x: x.get(),
        y: y.get(),
        focalX: e.focalX - width.get() / 2,
        focalY: e.focalY - height.get() / 2,
      });
    })
    .onUpdate((e) => {
      const from = start.get();
      const next = clamp(from.scale * e.scale, 1, MAX_ZOOM);
      // Keep the point between the fingers where it is.
      const k = next / from.scale;
      const maxX = (width.get() * (next - 1)) / 2;
      const maxY = (height.get() * (next - 1)) / 2;
      scale.set(next);
      x.set(clamp(from.focalX - (from.focalX - from.x) * k, -maxX, maxX));
      y.set(clamp(from.focalY - (from.focalY - from.y) * k, -maxY, maxY));
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      start.set({ ...start.get(), x: x.get(), y: y.get() });
    })
    .onUpdate((e) => {
      const from = start.get();
      const maxX = (width.get() * (scale.get() - 1)) / 2;
      const maxY = (height.get() * (scale.get() - 1)) / 2;
      x.set(clamp(from.x + e.translationX, -maxX, maxX));
      y.set(clamp(from.y + e.translationY, -maxY, maxY));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.get() > 1) {
        scale.set(withTiming(1));
        x.set(withTiming(0));
        y.set(withTiming(0));
        return;
      }
      // Zoom in on the tapped point.
      const maxX = (width.get() * (DOUBLE_TAP_ZOOM - 1)) / 2;
      const maxY = (height.get() * (DOUBLE_TAP_ZOOM - 1)) / 2;
      const focalX = e.x - width.get() / 2;
      const focalY = e.y - height.get() / 2;
      scale.set(withTiming(DOUBLE_TAP_ZOOM));
      x.set(withTiming(clamp(-focalX * (DOUBLE_TAP_ZOOM - 1), -maxX, maxX)));
      y.set(withTiming(clamp(-focalY * (DOUBLE_TAP_ZOOM - 1), -maxY, maxY)));
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={styles.gestureZoom}
        collapsable={false}
        onLayout={(e) => {
          width.set(e.nativeEvent.layout.width);
          height.set(e.nativeEvent.layout.height);
        }}>
        <Animated.View style={[styles.fill, animated]}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
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
  gestureZoom: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
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
