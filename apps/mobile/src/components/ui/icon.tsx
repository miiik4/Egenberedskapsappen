import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type IconName = SymbolViewProps['name'];

/** SF Symbols on iOS, Material Symbols on Android: pass `{ ios, android }` when the names differ. */
export function Icon({ name, size = 17, color }: { name: IconName; size?: number; color?: ColorValue }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
