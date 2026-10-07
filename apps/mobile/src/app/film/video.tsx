import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnalysis } from '@/analysis/analysis-provider';
import { analyseWithConsent } from '@/analysis/consent';
import { analysisErrorText } from '@/analysis/messages';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { Text } from '@/components/ui/text';

/** Long enough for any room at a slow walk; the server takes 60 frames from it at most. */
const MAX_SECONDS = 90;

/**
 * «Film et rom» (1a): walk slowly round the room. Recorded without sound, in real 1080p, since
 * a low-resolution source is what limited recognition in Idimy, not the model. Only frames
 * from the recording leave the phone, and the recording is deleted once they're taken.
 */
export default function FilmVideo() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const insets = useSafeAreaInsets();
  const { rooms, selectedPropertyId, analysisConsent } = useData();
  const { giveAnalysisConsent } = useActions();
  const { start } = useAnalysis();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const propertyRooms = rooms.filter((r) => r.propertyId === selectedPropertyId);
  const [roomId, setRoomId] = useState(params.roomId ?? propertyRooms[0]?.id ?? '');
  const [recording, setRecording] = useState<{ startedAt: number } | null>(null);
  const [clip, setClip] = useState<{ uri: string; durationMs: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const room = propertyRooms.find((r) => r.id === roomId);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - recording.startedAt) / 1000)), 250);
    return () => clearInterval(timer);
  }, [recording]);

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.message}>Appen trenger tilgang til kameraet for å filme rommet.</Text>
        <PrimaryButton
          label={permission.canAskAgain ? 'Gi tilgang' : 'Åpne Innstillinger'}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        />
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Avbryt</Text>
        </Pressable>
      </View>
    );
  }

  const shutter = async () => {
    if (recording) {
      camera.current?.stopRecording();
      return;
    }
    const startedAt = Date.now();
    setElapsed(0);
    setRecording({ startedAt });
    try {
      const result = await camera.current?.recordAsync({ maxDuration: MAX_SECONDS, codec: 'avc1' });
      if (result?.uri) setClip({ uri: result.uri, durationMs: Date.now() - startedAt });
    } catch {
      Alert.alert('Opptaket stoppet', 'Prøv å filme rommet på nytt.');
    } finally {
      setRecording(null);
    }
  };

  const retake = () => {
    if (clip) new File(clip.uri).delete();
    setClip(null);
  };

  const analyse = async () => {
    if (!clip) return;
    setStarting(true);
    try {
      const id = await start(roomId, { source: 'video', uri: clip.uri, durationMs: clip.durationMs });
      router.replace({ pathname: '/film/[id]', params: { id } });
    } catch (error) {
      Alert.alert('Kunne ikke starte analysen', analysisErrorText(error));
      setStarting(false);
    }
  };

  const confirmAndAnalyse = () =>
    analyseWithConsent({ consented: analysisConsent, giveConsent: giveAnalysisConsent, source: 'video' }, analyse);

  return (
    <View style={styles.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="video" videoQuality="1080p" mute />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (clip) retake();
            router.back();
          }}
          disabled={recording !== null}
          accessibilityRole="button"
          accessibilityLabel="Lukk"
          style={styles.round}>
          <Icon name={{ ios: 'xmark', android: 'close' }} size={17} color="#FFFFFF" />
        </Pressable>
        <View style={[styles.badge, recording && styles.badgeLive]}>
          <Text style={styles.badgeText}>{recording ? clock(elapsed) : clip ? clock(Math.round(clip.durationMs / 1000)) : 'HD'}</Text>
        </View>
        <View style={styles.round} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {!clip && <Text style={styles.hint}>{recording ? 'Gå sakte rundt i rommet' : 'Velg rom, og film hele rommet sakte'}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {propertyRooms.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRoomId(r.id)}
              disabled={recording !== null}
              accessibilityRole="radio"
              accessibilityState={{ selected: r.id === roomId }}
              style={[styles.chip, r.id === roomId && styles.chipOn]}>
              <Text style={[styles.chipText, r.id === roomId && styles.chipTextOn]}>{r.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {clip ? (
          <View style={styles.after}>
            <PrimaryButton label={room ? `Analyser ${room.name.toLowerCase()}` : 'Analyser'} onPress={confirmAndAnalyse} disabled={!room || starting} />
            <Pressable onPress={retake} disabled={starting} accessibilityRole="button" style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Ta opp på nytt</Text>
            </Pressable>
            <Text style={styles.note}>KI foreslår gjenstandene. Du ser gjennom alt før noe lagres.</Text>
          </View>
        ) : (
          <Pressable
            onPress={shutter}
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stopp opptaket' : 'Start opptaket'}
            style={styles.shutter}>
            <View style={recording ? styles.stop : styles.record} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', gap: 20 },
  message: { color: '#FFFFFF', fontSize: 17, textAlign: 'center', marginHorizontal: 32 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  badge: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  badgeLive: { backgroundColor: '#FF3B30' },
  badgeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, alignItems: 'center' },
  hint: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: Radius.pill, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  chipOn: { backgroundColor: '#FFFFFF' },
  chipText: { fontSize: 15, color: '#FFFFFF' },
  chipTextOn: { color: '#000000', fontWeight: '600' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  record: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FF3B30' },
  stop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FF3B30' },
  after: { alignSelf: 'stretch', gap: 6 },
  textButton: { alignSelf: 'center', paddingVertical: 8 },
  textButtonLabel: { color: '#FFFFFF', fontSize: 17 },
  note: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginHorizontal: 32 },
});
