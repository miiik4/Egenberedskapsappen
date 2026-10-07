import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAnalysis } from '@/analysis/analysis-provider';
import { analysisErrorText } from '@/analysis/messages';
import { loadFirebase } from '@/backup/load-firebase';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { pickFiles, type Source } from '@/documents/use-documents';
import { Text } from '@/components/ui/text';

/** What the server takes in one analysis of photos (functions/src/analysis/prompt.ts MAX_FRAMES). */
const MAX_PHOTOS = 30;

/**
 * «Dokumenter med KI»: photos of one room, analysed for the things in it. Nothing is added
 * until the user has looked the suggestions over.
 */
export default function Film() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const { rooms, selectedPropertyId, analysisConsent } = useData();
  const { giveAnalysisConsent } = useActions();
  const { ready, start } = useAnalysis();
  const propertyRooms = rooms.filter((r) => r.propertyId === selectedPropertyId);
  const [roomId, setRoomId] = useState(params.roomId ?? propertyRooms[0]?.id ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const room = propertyRooms.find((r) => r.id === roomId);

  if (!ready) return <NotAvailable />;

  const add = async (source: Source) => {
    const picked = await pickFiles(source, { single: source === 'camera' });
    setPhotos((current) => [...current, ...picked.map((p) => p.uri)].slice(0, MAX_PHOTOS));
  };

  const analyse = async () => {
    setStarting(true);
    try {
      const id = await start(roomId, { source: 'photos', uris: photos });
      router.replace({ pathname: '/film/[id]', params: { id } });
    } catch (error) {
      Alert.alert('Kunne ikke starte analysen', analysisErrorText(error));
    } finally {
      setStarting(false);
    }
  };

  const confirmAndAnalyse = () => {
    if (analysisConsent) return void analyse();
    Alert.alert(
      'Bildene sendes til analyse',
      'For å finne gjenstandene sendes bildene til en KI-tjeneste i EU. De slettes så snart analysen er ferdig. ' +
        'Svaret er kryptert, så bare denne telefonen kan lese det.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fortsett',
          onPress: async () => {
            await giveAnalysisConsent();
            await analyse();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <FormSheet title="Dokumenter med KI">
        <Text style={styles.lead}>
          Film rommet, eller ta bilder fra flere kanter, så foreslår KI gjenstandene med verdi. Du ser gjennom alt før noe lagres.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {propertyRooms.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRoomId(r.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: r.id === roomId }}
              style={[styles.chip, r.id === roomId && styles.chipOn]}>
              <Text style={[styles.chipText, r.id === roomId && styles.chipTextOn]}>{r.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {photos.length > 0 && (
          <View style={styles.grid}>
            {photos.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.tile}>
                <Image source={{ uri }} style={styles.tileImage} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((current) => current.filter((_, j) => j !== i))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Fjern bildet"
                  style={styles.remove}>
                  <Icon name={{ ios: 'xmark', android: 'close' }} size={11} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Section
          footer={
            photos.length === 0
              ? 'Få med hele rommet. Ta gjerne nærbilder av det som er verdt mye. Filmen tas uten lyd.'
              : `${photos.length} av inntil ${MAX_PHOTOS} bilder.`
          }>
          <Row
            title="Film rommet"
            titleColor={Colors.accent}
            onPress={() => router.replace({ pathname: '/film/video', params: roomId ? { roomId } : {} })}
          />
          <Row title="Ta bilde" titleColor={Colors.accent} onPress={() => add('camera')} />
          <Row title="Velg fra bilder" titleColor={Colors.accent} onPress={() => add('photos')} />
        </Section>
      </FormSheet>

      <View style={styles.bottom}>
        <PrimaryButton
          label={room ? `Analyser ${room.name.toLowerCase()}` : 'Analyser'}
          onPress={confirmAndAnalyse}
          disabled={photos.length === 0 || !room || starting}
        />
      </View>
    </View>
  );
}

/** Analysis runs on the backup the insurer pays for; without it, say how to get it. */
function NotAvailable() {
  const inThisBuild = loadFirebase() !== null;
  return (
    <FormSheet title="Dokumenter med KI">
      <Section
        footer={
          inThisBuild
            ? 'KI-analysen er en del av sikkerhetskopien, som forsikringsselskapet ditt dekker. Slå den på for å bruke den.'
            : 'KI-analysen finnes ikke i denne versjonen av appen.'
        }>
        {inThisBuild && <Row title="Slå på sikkerhetskopi" chevron onPress={() => router.push('/sikkerhetskopi')} />}
        <Row title="Legg inn gjenstander selv" chevron onPress={() => router.back()} />
      </Section>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  lead: { marginHorizontal: Spacing.screen + 4, fontSize: 15, lineHeight: 21, color: Colors.secondaryLabel },
  chips: { gap: 8, paddingHorizontal: Spacing.screen },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: Radius.pill, justifyContent: 'center', backgroundColor: Colors.card },
  chipOn: { backgroundColor: Colors.accent },
  chipText: { fontSize: 15, color: Colors.label },
  chipTextOn: { color: '#FFFFFF', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: Spacing.screen },
  tile: { width: '23.5%', aspectRatio: 1 },
  tileImage: { width: '100%', height: '100%', borderRadius: 10, borderCurve: 'continuous', backgroundColor: Colors.fill },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bottom: { paddingTop: 8, paddingBottom: 34, backgroundColor: Colors.background },
});
