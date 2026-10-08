import { DateTimePicker } from '@expo/ui/community/datetime-picker';

/** Elsewhere than iOS, the community picker; DateField only shows this on iOS. */
export function CompactDatePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  return <DateTimePicker value={value} mode="date" locale="nb-NO" onValueChange={(_, d) => d && onChange(d)} />;
}
