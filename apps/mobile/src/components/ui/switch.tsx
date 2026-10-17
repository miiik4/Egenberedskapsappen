import { Platform, Switch as NativeSwitch, type SwitchProps } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The app's switch: the brand's blue track when on, a white knob. iOS draws that itself; on
 * Android the knob would otherwise take the phone's own accent (green on a OnePlus), and the
 * off track the Material grey, so both are set there.
 */
export function Switch(props: SwitchProps) {
  return (
    <NativeSwitch
      trackColor={{ true: Colors.accent, false: Platform.OS === 'android' ? (Colors.tertiaryLabel as string) : undefined }}
      {...(Platform.OS === 'android' && { thumbColor: '#FFFFFF' })}
      {...props}
    />
  );
}
