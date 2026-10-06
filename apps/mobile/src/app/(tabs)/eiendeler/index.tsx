import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeInsurance } from '@/components/preparedness/home-insurance';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AddRow, EmptyRow, Row, Section } from '@/components/ui/list';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { formatKr } from '@/lib/format';

type Tab = 'innbo' | 'reise';

const openCamera = () => Alert.alert('Film et rom', 'Filming med KI kommer i en senere versjon.');

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
          accessibilityLabel="Film et rom"
          onPress={openCamera}
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
  const { rooms } = useData();
  const { savePolicy } = useActions();
  const { property, policy, documentedKr, alert } = useHomeInsurance();
  const propertyRooms = rooms.filter((room) => room.propertyId === property?.id);
  // Belongings come with filming; until then every room is unfilmed and worth nothing on record.
  const filmed = 0;
  const sumKr = policy?.sumKr;

  return (
    <>
      {alert && policy && sumKr !== undefined && (
        <Card gap={10}>
          <View style={styles.alertHead}>
            <Icon name={{ ios: 'exclamationmark.triangle', android: 'warning' }} size={18} color={Colors.warning} />
            <Text style={styles.alertTitle}>
              {alert === 'over' ? 'Innboet kan være underforsikret' : 'Innboet nærmer seg forsikringssummen'}
            </Text>
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
          {filmed} av {propertyRooms.length} rom er filmet.
        </Text>
      </Card>

      <Section
        header="Rom"
        separatorInset={74}
        footer="Bruk dette hvis du må melde en skade. Du kan dele en rapport direkte med forsikringsselskapet.">
        {propertyRooms.map((room) => (
          <Row
            key={room.id}
            title={room.name}
            subtitle="Ikke filmet"
            leading={<View style={styles.thumb} />}
            trailing={
              <Pressable onPress={openCamera} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Film ${room.name}`}>
                <Text style={styles.link}>Film</Text>
              </Pressable>
            }
            onPress={() => router.push({ pathname: '/rom', params: { id: room.id } })}
          />
        ))}
        <AddRow title="Legg til rom" onPress={() => router.push('/rom')} />
      </Section>

      <Section>
        <Row
          title="Innboforsikring"
          detail={sumKr !== undefined ? formatKr(sumKr) : 'Legg til'}
          chevron
          onPress={() => router.push('/forsikring')}
        />
        <Row title="Meld en skade" chevron onPress={() => Alert.alert('Meld en skade', 'Kommer i en senere versjon.')} />
      </Section>
    </>
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
  sum: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: Colors.label, fontVariant: ['tabular-nums'] },
  sumOf: { fontSize: 15, color: Colors.secondaryLabel },
  sumNote: { fontSize: 15, color: Colors.secondaryLabel },
  link: { fontSize: 17, color: Colors.accent },
  thumb: { width: 44, height: 44, borderRadius: 10, borderCurve: 'continuous', backgroundColor: Colors.fill },
});
