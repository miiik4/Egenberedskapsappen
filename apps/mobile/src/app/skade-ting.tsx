import {
  BELONGING_CATEGORIES,
  isBelongingCategory,
  isDamage,
  type Belonging,
  type BelongingCategory,
  type Damage,
} from '@egenberedskap/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { DAMAGE_OPTIONS } from '@/claims/claim-types';
import { useClaims } from '@/claims/use-claims';
import {
  confirmDelete,
  DestructiveButton,
  NumberField,
  parseNumber,
  TextField,
} from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { CheckCircle } from '@/components/ui/check-circle';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { pickFiles, type Picked, type Source } from '@/documents/use-documents';
import { countLabel, formatKr } from '@/lib/format';

/**
 * Screen for adding/editing items on a damage claim:
 * - mode="choose": Pick from documented belongings
 * - mode="custom" or itemId: Add uncatalogued item or edit existing claim item
 */
export default function SkadeTing() {
  const params = useLocalSearchParams<{
    claimId: string;
    mode?: 'choose' | 'custom';
    itemId?: string;
  }>();

  const { claims } = useData();
  const claim = claims.find((c) => c.id === params.claimId);

  if (!claim) {
    return (
      <FormSheet title="Gjenstand">
        <EmptyRow text="Skadesaken ble ikke funnet." />
      </FormSheet>
    );
  }

  if (params.mode === 'choose') {
    return <ChooseBelongings claim={claim} />;
  }

  return <CustomOrEditItem claim={claim} itemId={params.itemId} />;
}

/** Pick belongings from existing home inventory */
function ChooseBelongings({
  claim,
}: {
  claim: (ReturnType<typeof useData>)['claims'][number];
}) {
  const { belongings, rooms } = useData();
  const { addBelonging, removeItem } = useClaims();

  const defaultDamage: Damage = claim.kind === 'theft' ? 'stolen' : 'damaged';
  const [damage, setDamage] = useState<Damage>(defaultDamage);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Map of belongingId -> claimItemId
  const addedMap = new Map<string, string>();
  for (const item of claim.items) {
    if (item.belongingId) {
      addedMap.set(item.belongingId, item.id);
    }
  }

  const toggleBelonging = async (belonging: Belonging) => {
    if (busyId) return;
    setBusyId(belonging.id);
    try {
      const existingClaimItemId = addedMap.get(belonging.id);
      if (existingClaimItemId) {
        await removeItem(existingClaimItemId);
      } else {
        await addBelonging(claim.id, belonging, damage);
      }
    } catch {
      Alert.alert('Kunne ikke oppdatere gjenstand', 'Prøv igjen.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormSheet title="Velg fra innbo">
      <View style={styles.intro}>
        <Text style={styles.lead}>
          Trykk på gjenstandene som er berørt av skaden for å legge dem til i skademeldingen.
        </Text>
      </View>

      <Section header="Skadegrad for valgte ting">
        <MenuField
          label="Tilstand"
          value={damage}
          options={DAMAGE_OPTIONS}
          onChange={(v) => isDamage(v) && setDamage(v)}
        />
      </Section>

      <Section
        header={`Innbo (${belongings.length})`}
        footer={`${countLabel(addedMap.size)} lagt til i denne skadesaken.`}>
        {belongings.length === 0 ? (
          <EmptyRow text="Ingen gjenstander er dokumentert i innboet ennå." />
        ) : (
          belongings.map((b) => {
            const isAdded = addedMap.has(b.id);
            const room = rooms.find((r) => r.id === b.roomId);
            const subtitle = [b.category, room?.name].filter(Boolean).join(' · ');
            const valueText = b.valueKr !== undefined ? formatKr(b.valueKr) : undefined;

            return (
              <Row
                key={b.id}
                title={b.name}
                subtitle={subtitle}
                detail={valueText}
                leading={<CheckCircle on={isAdded} />}
                onPress={() => toggleBelonging(b)}
              />
            );
          })
        )}
      </Section>
    </FormSheet>
  );
}

/** Add an uncatalogued item or edit an existing claim item */
function CustomOrEditItem({
  claim,
  itemId,
}: {
  claim: (ReturnType<typeof useData>)['claims'][number];
  itemId?: string;
}) {
  const existing = claim.items.find((i) => i.id === itemId);
  const { saveItem, removeItem } = useClaims();

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<BelongingCategory>(existing?.category ?? 'Annet');
  const defaultDamage: Damage = claim.kind === 'theft' ? 'stolen' : 'damaged';
  const [damage, setDamage] = useState<Damage>(existing?.damage ?? defaultDamage);
  const [value, setValue] = useState(existing?.valueKr !== undefined ? String(existing.valueKr) : '');
  const [receipt, setReceipt] = useState<Picked | 'remove' | undefined>();
  const [saving, setSaving] = useState(false);

  const valueKr = parseNumber(value);
  const savedReceiptId = existing?.receipt?.id;
  const hasReceipt = receipt === 'remove' ? false : Boolean(receipt ?? savedReceiptId);

  const chooseReceipt = async (source: Source) => {
    const [picked] = await pickFiles(source, { single: true });
    if (picked) setReceipt(picked);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveItem(
        {
          id: existing?.id,
          claimId: claim.id,
          belongingId: existing?.belongingId,
          roomId: existing?.roomId,
          name: name.trim(),
          category,
          damage,
          ...(valueKr !== undefined && { valueKr: Math.round(valueKr) }),
          valueEstimated: existing?.valueEstimated ?? false,
        },
        receipt,
        savedReceiptId,
      );
      router.back();
    } catch {
      Alert.alert('Kunne ikke lagre gjenstanden', 'Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={existing ? 'Rediger gjenstand' : 'Legg til gjenstand'}
      canSave={name.trim() !== '' && !saving}
      onSave={save}>
      <Section header="Om gjenstanden">
        <TextField
          label="Navn"
          value={name}
          onChange={setName}
          placeholder="F.eks. Sykkel eller TV"
          autoFocus={!existing}
        />
        <MenuField
          label="Kategori"
          value={category}
          options={BELONGING_CATEGORIES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => isBelongingCategory(v) && setCategory(v)}
        />
        <MenuField
          label="Skade"
          value={damage}
          options={DAMAGE_OPTIONS}
          onChange={(v) => isDamage(v) && setDamage(v)}
        />
        <NumberField
          label="Verdi"
          value={value}
          onChange={setValue}
          unit="kr"
        />
      </Section>

      <Section
        header="Kvittering"
        footer="Kvittering dokumenterer opprinnelig kjøpesum og alder for forsikringsselskapet.">
        {hasReceipt ? (
          <>
            {savedReceiptId && receipt === undefined ? (
              <Row
                title="Vis kvittering"
                chevron
                onPress={() => router.push({ pathname: '/fil', params: { id: savedReceiptId } })}
              />
            ) : (
              <Row title="Kvittering valgt" detail="Lagres med ✓" />
            )}
            <Row
              title="Fjern kvittering"
              titleColor={Colors.destructive}
              onPress={() => setReceipt('remove')}
            />
          </>
        ) : (
          <>
            <Row
              title="Ta bilde av kvittering"
              titleColor={Colors.accent}
              onPress={() => chooseReceipt('camera')}
            />
            <Row
              title="Velg fil eller bilde"
              titleColor={Colors.accent}
              onPress={() => chooseReceipt('files')}
            />
          </>
        )}
      </Section>

      {existing && (
        <DestructiveButton
          label="Fjern fra skadesaken"
          onPress={() =>
            confirmDelete('Fjerne gjenstanden?', existing.name, () => removeItem(existing.id))
          }
        />
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: Spacing.screen,
    paddingTop: 4,
    paddingBottom: 12,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.secondaryLabel,
  },
});
