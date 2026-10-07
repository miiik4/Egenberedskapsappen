import { summarizeRooms } from '@egenberedskap/core';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { INSURANCE_ALERT_TITLE, useHomeInsurance } from '@/components/preparedness/home-insurance';
import { Card } from '@/components/ui/card';
import { WarningDot } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { AddRow, EmptyRow, Row, Section } from '@/components/ui/list';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { storedFile } from '@/documents/files';
import { countLabel, formatKr } from '@/lib/format';
import { Text } from '@/components/ui/text';

type Tab = 'innbo' | 'reise';

const document = (roomId?: string) => router.push(roomId ? { pathname: '/film', params: { roomId } } : '/film');

export default function Eiendeler() {
  const { properties, selectedPropertyId } = useData();
  const { selectProperty } = useActions();
  const [tab, setTab] = useState<Tab>('innbo');
  const property = properties.find((p) => p.id === selectedPropertyId);

  return (
    <>
      <Stack.Screen options={{ title: 'Eiendeler' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Label>{property?.shortName ?? 'Eiendom'}</Stack.Toolbar.Label>
          {properties.map((p) => (
            <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === property?.id} onPress={() => selectProperty(p.id)}>
              {p.shortName}
            </Stack.Toolbar.MenuAction>
          ))}
          {property && (
            <Stack.Toolbar.MenuAction
              icon="pencil"
              onPress={() => router.push({ pathname: '/eiendom', params: { id: property.id } })}>
              Rediger {property.shortName.toLowerCase()}
            </Stack.Toolbar.MenuAction>
          )}
          <Stack.Toolbar.MenuAction icon="plus" onPress={() => router.push('/eiendom')}>
            Ny eiendom
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.plus}
          variant="prominent"
          tintColor={Colors.accent}
          accessibilityLabel="Dokumenter et rom med KI"
          onPress={() => document()}
        />
      </Stack.Toolbar>

      <Screen>
        <Segmented
          options={[
            { value: 'innbo', label: 'Innbo' },
            { value: 'reise', label: 'Reise' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'innbo' ? <Innbo /> : <Reise />}
      </Screen>
    </>
  );
}

function Innbo() {
  const { rooms, belongings } = useData();
  const { savePolicy } = useActions();
  const { property, policy, documentedKr, alert } = useHomeInsurance();
  const propertyRooms = rooms.filter((room) => room.propertyId === property?.id);
  const summaries = summarizeRooms(belongings);
  const documented = propertyRooms.filter((room) => summaries.has(room.id)).length;
  const sumKr = policy?.sumKr;

  return (
    <>
      {alert && policy && sumKr !== undefined && (
        <Card gap={10}>
          <View style={styles.alertHead}>
            <Icon name={{ ios: 'exclamationmark.triangle', android: 'warning' }} size={18} color={Colors.warning} />
            <Text style={styles.alertTitle}>{INSURANCE_ALERT_TITLE[alert]}</Text>
          </View>
          <Text style={styles.alertBody}>
            Dere har dokumentert {formatKr(documentedKr)}, og forsikringssummen er {formatKr(sumKr)}. Ved en stor skade
            kan dere få mindre utbetalt enn tingene er verdt.
          </Text>
          <View style={styles.alertButtons}>
            <SmallButton label="Se forsikringen" prominent onPress={() => router.push('/forsikring')} />
            {/* Hidden until the documented value goes up again. */}
            <SmallButton label="Ikke nå" onPress={() => savePolicy({ ...policy, alertDismissedKr: documentedKr })} />
          </View>
        </Card>
      )}

      <PendingAnalyses />

      <Card>
        <View style={styles.sumHead}>
          <Text style={styles.sum}>{formatKr(documentedKr)}</Text>
          {sumKr !== undefined && <Text style={styles.sumOf}>av {formatKr(sumKr)}</Text>}
        </View>
        <ProgressBar
          value={sumKr ? documentedKr / sumKr : 0}
          color={alert === 'over' ? Colors.warning : Colors.accent}
        />
        <Text style={styles.sumNote}>
          {sumKr !== undefined ? 'av forsikringssummen. ' : 'dokumentert. '}
          {documented} av {propertyRooms.length} rom er dokumentert.
        </Text>
      </Card>

      <Section
        header="Rom"
        separatorInset={74}
        footer="Bruk dette hvis du må melde en skade. Du kan dele en rapport direkte med forsikringsselskapet.">
        {propertyRooms.map((room) => {
          const summary = summaries.get(room.id);
          const cover = belongings.find((b) => b.roomId === room.id && b.photo)?.photo;
          return (
            <Row
              key={room.id}
              title={room.name}
              subtitle={summary ? `${countLabel(summary.count)} · ${formatKr(summary.valueKr)}` : 'Ikke dokumentert'}
              leading={
                cover ? (
                  <Image source={{ uri: storedFile(cover.fileName).uri }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={styles.thumb} />
                )
              }
              trailing={
                summary ? undefined : (
                  <Pressable
                    onPress={() => document(room.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Dokumenter ${room.name}`}>
                    <Text style={styles.link}>Dokumenter</Text>
                  </Pressable>
                )
              }
              onPress={() => router.push({ pathname: '/eiendeler/rom/[id]', params: { id: room.id } })}
            />
          );
        })}
        <AddRow title="Legg til rom" onPress={() => router.push('/rom')} />
      </Section>

      <Section>
        <Row
          title="Innboforsikring"
          detail={sumKr !== undefined ? formatKr(sumKr) : 'Legg til'}
          chevron
          onPress={() => router.push('/forsikring')}
        />
        <Row title="Lag innbooversikt (PDF)" chevron onPress={() => router.push('/rapport')} />
        <Row
          title="Meld en skade"
          chevron
          onPress={() =>
            Alert.alert('Meld en skade', 'Veiviseren kommer i en senere versjon. Legg gjerne ved en innbooversikt når du melder skaden.')
          }
        />
      </Section>
    </>
  );
}

/** Analyses on their way, or with suggestions to look over. */
function PendingAnalyses() {
  const { analyses, rooms } = useData();
  if (analyses.length === 0) return null;
  const describe = (a: (typeof analyses)[number]) =>
    a.status === 'uploading'
      ? 'Laster opp bilder'
      : a.status === 'waiting'
        ? 'Analyserer'
        : a.status === 'failed'
          ? 'Analysen ble ikke fullført'
          : `${countLabel(a.suggestions?.length ?? 0)} venter på gjennomgang`;
  return (
    <Section header="KI-analyse">
      {analyses.map((a) => (
        <Row
          key={a.id}
          title={rooms.find((r) => r.id === a.roomId)?.name ?? 'Rom'}
          subtitle={describe(a)}
          trailing={a.status === 'ready' ? <WarningDot /> : undefined}
          chevron
          onPress={() => router.push({ pathname: '/film/[id]', params: { id: a.id } })}
        />
      ))}
    </Section>
  );
}

function SmallButton({ label, onPress, prominent }: { label: string; onPress: () => void; prominent?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.small, prominent && styles.smallProminent, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.smallText, prominent && styles.smallTextProminent]}>{label}</Text>
    </Pressable>
  );
}

function Reise() {
  return (
    <Section footer="Ta med ting fra innboet på en reise, og film bagasjen før avreise.">
      <EmptyRow text="Reiser kommer i en senere versjon." />
    </Section>
  );
}

const styles = StyleSheet.create({
  alertHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alertTitle: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 22, color: Colors.label },
  alertBody: { fontSize: 15, lineHeight: 21, color: Colors.secondaryLabel },
  alertButtons: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  small: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill },
  smallProminent: { backgroundColor: Colors.accent },
  smallText: { fontSize: 15, fontWeight: '600', color: Colors.label },
  smallTextProminent: { color: '#FFFFFF' },
  sumHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sum: { fontFamily: Fonts.display, fontSize: 28, letterSpacing: -0.5, color: Colors.label, fontVariant: ['tabular-nums'] },
  sumOf: { fontSize: 15, color: Colors.secondaryLabel },
  sumNote: { fontSize: 15, color: Colors.secondaryLabel },
  link: { fontSize: 17, color: Colors.accent },
  thumb: { width: 44, height: 44, borderRadius: 10, borderCurve: 'continuous', backgroundColor: Colors.fill },
});
