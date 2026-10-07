import { BELONGING_CATEGORIES, type BelongingCategory } from '@egenberedskap/core';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBelongings, type FileChange } from '@/belongings/use-belongings';
import { confirmDelete, DestructiveButton, NumberField, parseNumber, TextField } from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { storedFile } from '@/documents/files';
import { pickFiles, type Source } from '@/documents/use-documents';

/**
 * One thing in the home: a photo, what it is, where it is, what it's worth, and the receipt
 * if there is one. Opened from a room, for a new thing or an existing one. Nothing is saved
 * until ✓, files included.
 */
export default function Gjenstand() {
  const params = useLocalSearchParams<{ id?: string; roomId?: string }>();
  const { belongings, rooms } = useData();
  const { save: saveBelonging, remove } = useBelongings();
  const existing = belongings.find((b) => b.id === params.id);
  const roomId = existing?.roomId ?? params.roomId;
  const propertyId = rooms.find((r) => r.id === roomId)?.propertyId;
  const propertyRooms = rooms.filter((r) => r.propertyId === propertyId);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<BelongingCategory>(existing?.category ?? 'Annet');
  const [room, setRoom] = useState(roomId ?? '');
  const [value, setValue] = useState(existing?.valueKr !== undefined ? String(existing.valueKr) : '');
  const [photo, setPhoto] = useState<FileChange>();
  const [receipt, setReceipt] = useState<FileChange>();
  const [saving, setSaving] = useState(false);

  // An estimate stays one until the user types their own figure.
  const valueKr = parseNumber(value);
  const estimated = Boolean(existing?.valueEstimated) && valueKr === existing?.valueKr;
  const photoUri = photo === 'remove' ? undefined : (photo?.uri ?? (existing?.photo && storedFile(existing.photo.fileName).uri));
  const savedReceiptId = existing?.receipt?.id;
  const hasReceipt = receipt === 'remove' ? false : Boolean(receipt ?? savedReceiptId);

  const choose = async (source: Source, set: (change: FileChange) => void) => {
    const [picked] = await pickFiles(source, { single: true });
    if (picked) set(picked);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveBelonging(
        {
          id: existing?.id,
          roomId: room,
          name,
          category,
          ...(valueKr !== undefined && { valueKr: Math.round(valueKr) }),
          valueEstimated: estimated,
        },
        { photo, receipt, photoId: existing?.photo?.id, receiptId: existing?.receipt?.id },
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet title={existing ? 'Rediger' : 'Ny gjenstand'} canSave={name.trim() !== '' && room !== '' && !saving} onSave={save}>
      <View style={styles.photoBlock}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel={name || 'Bilde'} />
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Icon name={{ ios: 'photo', android: 'image' }} size={28} color={Colors.tertiaryLabel} />
          </View>
        )}
        <View style={styles.photoButtons}>
          <SmallButton label={photoUri ? 'Ta nytt bilde' : 'Ta bilde'} onPress={() => choose('camera', setPhoto)} />
          <SmallButton label="Velg fra bilder" onPress={() => choose('photos', setPhoto)} />
          {photoUri && <SmallButton label="Fjern" onPress={() => setPhoto('remove')} />}
        </View>
      </View>

      <Section
        footer={
          estimated
            ? 'KI-anslag basert på lignende produkter. Endre hvis du vet hva den kostet.'
            : 'Hva det vil koste å kjøpe det samme nytt.'
        }>
        <TextField label="Navn" value={name} onChange={setName} placeholder="F.eks. TV i stua" autoFocus={!existing} />
        <MenuField
          label="Kategori"
          value={category}
          options={BELONGING_CATEGORIES.map((c) => ({ value: c, label: c }))}
          onChange={setCategory}
        />
        {propertyRooms.length > 0 && (
          <MenuField label="Rom" value={room} options={propertyRooms.map((r) => ({ value: r.id, label: r.name }))} onChange={setRoom} />
        )}
        <NumberField label="Verdi" value={value} onChange={setValue} unit="kr" />
      </Section>

      <Section header="Kvittering" footer="Kvitteringen viser hva tingen kostet, hvis du må melde en skade.">
        {hasReceipt ? (
          <>
            {savedReceiptId && receipt === undefined ? (
              <Row title="Vis kvitteringen" chevron onPress={() => router.push({ pathname: '/fil', params: { id: savedReceiptId } })} />
            ) : (
              <Row title="Kvittering lagt til" detail="Lagres med ✓" />
            )}
            <Row title="Fjern kvitteringen" titleColor={Colors.destructive} onPress={() => setReceipt('remove')} />
          </>
        ) : (
          <>
            <Row title="Ta bilde av kvitteringen" titleColor={Colors.accent} onPress={() => choose('camera', setReceipt)} />
            <Row title="Velg fil eller bilde" titleColor={Colors.accent} onPress={() => choose('files', setReceipt)} />
          </>
        )}
      </Section>

      {existing && (
        <DestructiveButton
          label="Slett gjenstand"
          onPress={() => confirmDelete('Slette gjenstanden?', existing.name, () => remove(existing.id))}
        />
      )}
    </FormSheet>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.small, pressed && { opacity: 0.7 }]}>
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoBlock: { marginHorizontal: Spacing.screen, gap: 10 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.card, borderCurve: 'continuous', backgroundColor: Colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  small: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: Colors.accentSoft },
  smallText: { fontSize: 15, fontWeight: '600', color: Colors.accent },
});
