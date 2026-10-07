import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS's compact date button, in a host sized to the button both ways. The community wrapper
 * only fits the height, so in a row the picker drew wider than its box and ran under the
 * button next to it.
 */
export function CompactDatePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  return (
    <Host matchContents>
      <DatePicker
        selection={value}
        displayedComponents={['date']}
        onDateChange={onChange}
        modifiers={[datePickerStyle('compact'), environment('locale', 'nb-NO')]}
      />
    </Host>
  );
}
