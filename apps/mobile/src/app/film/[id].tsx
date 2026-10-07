import type { Suggestion } from '@egenberedskap/core';
import type { Analysis } from '@egenberedskap/store';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAnalysis } from '@/analysis/analysis-provider';
import { analysisErrorText } from '@/analysis/messages';
import { cropFile } from '@/analysis/photos';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { ProgressBar } from '@/components/ui/progress';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { countLabel, formatKr } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** After this long, say that it can take a few minutes, so the screen never seems stuck. */
const SLOW_AFTER_S = 60;

/** One analysis: its progress while it runs, then the suggestions to look over (1b, 1c). */
export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { analyses, rooms } = useData();
  const analysis = analyses.find((a) => a.id === id);
  const room = rooms.find((r) => r.id === analysis?.roomId);
  if (!analysis) return <FormSheet title="Analyse"><EmptyRow text="Analysen er ferdig." /></FormSheet>;

  const title = room?.name ?? 'Analyse';
  if (analysis.status === 'ready') return <Review analysis={analysis} title={title} />;
  if (analysis.status === 'failed') return <Failed analysis={analysis} title={title} />;
  return <Running analysis={analysis} title={title} />;
}

function Running({ analysis, title }: { analysis: Analysis; title: string }) {
  const { progress, discard } = useAnalysis();
  const p = progress[analysis.id];
  const elapsed = useElapsed(analysis.createdAt);
  const uploading = analysis.status === 'uploading';
  const share = p ? (p.prepared + p.uploaded) / (2 * p.total) : uploading ? 0 : 1;

  const cancel = () =>
    Alert.alert('Avbryte analysen?', 'Bildene slettes, og ingenting blir lagt inn.', [
      { text: 'Fortsett analysen', style: 'cancel' },
      {
        text: 'Avbryt',
        style: 'destructive',
        onPress: async () => {
          await discard(analysis.id);
          router.back();
        },
      },
    ]);

  return (
    <FormSheet title="Analyserer">
      <Card gap={10}>
        <Text style={styles.roomTitle}>{title}</Text>
        <Text style={styles.muted}>
          {analysis.frameCount} {analysis.frameCount === 1 ? 'bilde' : 'bilder'} · {clock(elapsed)}
        </Text>
        {uploading && (
          <>
            <ProgressBar value={share} />
            <Text style={styles.muted}>
              {p && p.uploaded > 0 ? `Laster opp ${p.uploaded} av ${p.total} bilder` : 'Gjør bildene klare'}
            </Text>
          </>
        )}
      </Card>

      <Section>
        <Step done={!uploading} active={uploading} label="Bildene er mottatt" />
        <Step done={false} active={!uploading} label="Ser etter gjenstander og verdier" />
        <Step done={false} active={false} label="Klar til gjennomgang" />
      </Section>

      <Text style={styles.note}>
        {uploading
          ? 'Hold appen åpen til bildene er lastet opp.'
          : `Du kan lukke appen. Forslagene venter her når du kommer tilbake.${elapsed > SLOW_AFTER_S ? ' Dette kan ta noen minutter.' : ''}`}
      </Text>
      <Text style={styles.note}>Ingenting legges inn automatisk. Du bestemmer hva som blir med.</Text>

      <Pressable onPress={cancel} accessibilityRole="button" style={styles.textButton}>
        <Text style={styles.cancel}>Avbryt analysen</Text>
      </Pressable>
    </FormSheet>
  );
}

function Step({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <Row
      title={label}
      titleColor={done || active ? Colors.label : Colors.secondaryLabel}
      leading={
        done ? (
          <CheckCircle on />
        ) : active ? (
          <View style={styles.stepIcon}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <CheckCircle on={false} />
        )
      }
    />
  );
}

function Failed({ analysis, title }: { analysis: Analysis; title: string }) {
  const { discard } = useAnalysis();
  const close = async () => {
    await discard(analysis.id);
    router.back();
  };
  const retry = async () => {
    await discard(analysis.id);
    router.replace({ pathname: '/film', params: { roomId: analysis.roomId } });
  };
  return (
    <FormSheet title={title}>
      <Section header="Analysen ble ikke ferdig" footer={analysisErrorText(analysis.error ?? 'failed')}>
        <Row title="Prøv igjen" titleColor={Colors.accent} onPress={retry} />
        <Row title="Lukk" onPress={close} />
      </Section>
    </FormSheet>
  );
}

function Review({ analysis, title }: { analysis: Analysis; title: string }) {
  const { accept, discard, updateSuggestion, selectAll } = useAnalysis();
  const [saving, setSaving] = useState(false);
  const suggestions = analysis.suggestions ?? [];
  const chosen = suggestions.filter((s) => s.selected);
  const total = chosen.reduce((sum, s) => sum + (s.valueKr ?? 0), 0);
  const allOn = chosen.length === suggestions.length;

  const add = async () => {
    setSaving(true);
    try {
      await accept(analysis.id);
      router.back();
    } finally {
      setSaving(false);
    }
  };
  const throwAway = () =>
    Alert.alert('Forkaste forslagene?', 'Ingenting blir lagt inn, og bildene fra analysen slettes.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Forkast',
        style: 'destructive',
        onPress: async () => {
          await discard(analysis.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <FormSheet title={title}>
        <Text style={styles.lead}>
          {suggestions.length === 0
            ? 'Vi fant ingen gjenstander i bildene. Prøv igjen med flere bilder, eller legg dem inn selv.'
            : `Vi fant ${countLabel(suggestions.length)}. Huk av det du vil legge inn.`}
        </Text>
        {suggestions.length > 0 && (
          <Section
            separatorInset={108}
            footer="Trykk for å endre navn, kategori eller verdi. Verdiene er KI-anslag basert på lignende produkter.">
            <Row title={allOn ? 'Fjern alle' : 'Velg alle'} titleColor={Colors.accent} onPress={() => selectAll(analysis.id, !allOn)} />
            {suggestions.map((s, i) => (
              <SuggestionRow
                key={i}
                suggestion={s}
                image={s.cropFile && cropFile(analysis.id, s.cropFile).uri}
                onToggle={() => updateSuggestion(analysis.id, i, { selected: !s.selected })}
                onEdit={() => router.push({ pathname: '/film/forslag', params: { id: analysis.id, index: String(i) } })}
              />
            ))}
          </Section>
        )}
        <Pressable onPress={throwAway} accessibilityRole="button" style={styles.textButton}>
          <Text style={styles.cancel}>Forkast forslagene</Text>
        </Pressable>
      </FormSheet>
      {suggestions.length > 0 && (
        <View style={styles.bottom}>
          <Text style={styles.summary}>
            {chosen.length} valgt · {formatKr(total)}
          </Text>
          <PrimaryButton
            label={chosen.length === 0 ? 'Ingen valgt' : `Legg til ${countLabel(chosen.length)}`}
            onPress={add}
            disabled={chosen.length === 0 || saving}
          />
        </View>
      )}
    </View>
  );
}

function SuggestionRow({
  suggestion,
  image,
  onToggle,
  onEdit,
}: {
  suggestion: Suggestion;
  image: string | undefined;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <Row
      title={suggestion.name}
      subtitle={`${suggestion.category} · ${suggestion.valueKr !== undefined ? formatKr(suggestion.valueKr) : 'Uten verdi'}`}
      leading={
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: suggestion.selected }}
          accessibilityLabel={suggestion.name}
          style={styles.leading}>
          <CheckCircle on={suggestion.selected} />
          {image ? (
            <Image source={{ uri: image }} style={styles.thumb} contentFit="contain" />
          ) : (
            <View style={[styles.thumb, styles.noImage]}>
              <Icon name={{ ios: 'photo', android: 'image' }} size={15} color={Colors.tertiaryLabel} />
            </View>
          )}
        </Pressable>
      }
      chevron
      onPress={onEdit}
    />
  );
}

/** Seconds since the analysis started, ticking. */
function useElapsed(since: string): number {
  const start = Date.parse(since);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.round((now - start) / 1000));
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  roomTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.label },
  muted: { fontSize: 15, color: Colors.secondaryLabel },
  note: { marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -12, fontSize: 13, lineHeight: 18, color: Colors.secondaryLabel },
  lead: { marginHorizontal: Spacing.screen + 4, fontSize: 15, lineHeight: 21, color: Colors.secondaryLabel },
  stepIcon: { width: 24, alignItems: 'center' },
  textButton: { alignSelf: 'center', paddingVertical: 8 },
  cancel: { fontSize: 17, color: Colors.destructive },
  leading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 10, borderCurve: 'continuous', backgroundColor: Colors.fill },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  summary: { textAlign: 'center', fontSize: 15, color: Colors.secondaryLabel },
  bottom: { gap: 8, paddingTop: 10, paddingBottom: 34, backgroundColor: Colors.background },
});
