import { addDays, type IsoDate } from '@egenberedskap/core';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router } from 'expo-router';
import { useState, type Ref } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type KeyboardTypeOptions,
  type TextInput as NativeTextInput,
} from 'react-native';

import { Icon } from '@/components/ui/icon';
import { CompactDatePicker } from './compact-date-picker';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDateWithYear, todayIso } from '@/lib/format';
import { fromPickerDate, toPickerDate } from '@/lib/picker-date';
import { Text, TextInput } from '@/components/ui/text';

/** Label on the left, value on the right: the row layout iOS uses in Settings and Contacts. */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>{children}</View>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoFocus,
  autoCapitalize = 'sentences',
  textContentType,
  secret,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  textContentType?: 'name' | 'telephoneNumber' | 'fullStreetAddress' | 'none';
  /** A code that must not be learnt or suggested by the keyboard: no autocorrect, spellcheck or autofill. */
  secret?: boolean;
}) {
  return (
    <FieldRow label={label}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.tertiaryLabel}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        autoCorrect={!secret}
        spellCheck={!secret}
        autoComplete={secret ? 'off' : undefined}
        accessibilityLabel={label}
        style={styles.input}
      />
    </FieldRow>
  );
}

/**
 * A positive number with a unit, e.g. «12 l» or «4 000 kr». Accepts a decimal comma, as
 * Norwegian keyboards type it. `value` is the raw text so the user can type freely.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  decimals = false,
  ref,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  decimals?: boolean;
  /** For focusing the field from outside, e.g. as it appears. */
  ref?: Ref<NativeTextInput>;
}) {
  return (
    <FieldRow label={label}>
      <View style={styles.numberRow}>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(text.replace(decimals ? /[^\d,.]/g : /\D/g, ''))}
          placeholder="0"
          placeholderTextColor={Colors.tertiaryLabel}
          keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
          accessibilityLabel={label}
          ref={ref}
          style={[styles.input, styles.numberInput]}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </FieldRow>
  );
}

export function parseNumber(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

/** An optional date: «Legg til» until set, then the native picker and a way to clear it. */
export function DateField({
  label,
  value,
  onChange,
  suggest = 365,
}: {
  label: string;
  value: IsoDate | undefined;
  onChange: (value: IsoDate | undefined) => void;
  /** How far ahead a new date starts, in days. */
  suggest?: number;
}) {
  const [androidOpen, setAndroidOpen] = useState(false);

  if (!value) {
    return (
      <FieldRow label={label}>
        <Pressable onPress={() => onChange(addDays(todayIso(), suggest))} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Legg til</Text>
        </Pressable>
      </FieldRow>
    );
  }

  // iOS's picker works in local time, Android's in UTC (lib/picker-date.ts).
  const utc = Platform.OS === 'android';
  const date = toPickerDate(value, utc);
  const pick = (picked?: Date) => picked && onChange(fromPickerDate(picked, utc));

  return (
    <FieldRow label={label}>
      <View style={styles.dateRow}>
        {Platform.OS === 'ios' ? (
          <CompactDatePicker value={date} onChange={pick} />
        ) : (
          <>
            <Pressable onPress={() => setAndroidOpen(true)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{formatDateWithYear(value)}</Text>
            </Pressable>
            {androidOpen && (
              <DateTimePicker
                value={date}
                mode="date"
                // The calendar itself follows the phone's language on Android; the buttons don't have to.
                locale="nb-NO"
                positiveButton={{ label: 'OK' }}
                negativeButton={{ label: 'Avbryt' }}
                onChange={(event, d) => {
                  setAndroidOpen(false);
                  if (event.type === 'set') pick(d);
                }}
              />
            )}
          </>
        )}
        <Pressable
          onPress={() => onChange(undefined)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Fjern ${label.toLowerCase()}`}>
          <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel' }} size={18} color={Colors.tertiaryLabel} />
        </Pressable>
      </View>
    </FieldRow>
  );
}

/** − n + for small whole numbers like the household size. */
export function CountField({
  label,
  value,
  onChange,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  const min = 1;
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <FieldRow label={label}>
      <View style={styles.stepper} accessibilityRole="adjustable" accessibilityValue={{ now: value, min, max }}>
        <StepButton symbol="−" onPress={() => step(-1)} disabled={value <= min} label="Færre" />
        <Text style={styles.count}>{value}</Text>
        <StepButton symbol="+" onPress={() => step(1)} disabled={value >= max} label="Flere" />
      </View>
    </FieldRow>
  );
}

function StepButton({
  symbol,
  onPress,
  disabled,
  label,
}: {
  symbol: string;
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepButton, (pressed || disabled) && { opacity: 0.4 }]}>
      <Text style={styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

/** «Slett gjenstand» etc., alone in its own card at the bottom of a form. */
export function DestructiveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.destructive, pressed && { opacity: 0.7 }]}>
      <Text style={styles.destructiveText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: Spacing.rowInset,
  },
  label: { fontSize: 17, color: Colors.label },
  value: { flex: 1, alignItems: 'flex-end' },
  input: { alignSelf: 'stretch', textAlign: 'right', fontSize: 17, color: Colors.secondaryLabel, paddingVertical: 12 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numberInput: { minWidth: 60, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 17, color: Colors.secondaryLabel },
  link: { fontSize: 17, color: Colors.accent },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
  },
  stepSymbol: { fontSize: 20, fontWeight: '500', color: Colors.label, lineHeight: 22 },
  count: { minWidth: 24, textAlign: 'center', fontSize: 17, fontWeight: '600', color: Colors.label },
  destructive: {
    marginHorizontal: Spacing.screen,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  destructiveText: { fontSize: 17, color: Colors.destructive },
});

/** Asks before deleting, then runs `onDelete` and closes the sheet. */
export function confirmDelete(question: string, detail: string, onDelete: () => Promise<void>) {
  Alert.alert(question, detail, [
    { text: 'Avbryt', style: 'cancel' },
    {
      text: 'Slett',
      style: 'destructive',
      onPress: async () => {
        await onDelete();
        router.back();
      },
    },
  ]);
}
