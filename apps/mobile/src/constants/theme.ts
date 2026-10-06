import { Platform, PlatformColor, type ColorValue } from 'react-native';

/**
 * On iOS the neutral colours are the system's semantic colours, so light and dark mode,
 * increased contrast and future iOS looks come for free. Android gets fixed values
 * matching the iOS light appearance until it gets its own pass.
 */
const system = (ios: string, android: string): ColorValue =>
  Platform.OS === 'ios' ? PlatformColor(ios) : android;

export const Colors = {
  background: system('systemGroupedBackground', '#F2F2F7'),
  card: system('secondarySystemGroupedBackground', '#FFFFFF'),
  fill: system('tertiarySystemFill', '#E5E5EA'),
  label: system('label', '#000000'),
  secondaryLabel: system('secondaryLabel', '#6D6D72'),
  tertiaryLabel: system('tertiaryLabel', '#C4C4C7'),
  separator: system('separator', '#C6C6C8'),

  accent: '#0E5FC0',
  accentSoft: 'rgba(14,95,192,0.11)',
  destructive: system('systemRed', '#D70015'),
  success: system('systemGreen', '#248A3D'),
  successSoft: 'rgba(52,199,89,0.16)',

  /** The one warning colour: the dot by something about to expire, and an overfull bar. */
  warning: '#FF9F0A',
  warningText: '#A35200',
  warningSoft: 'rgba(255,159,10,0.16)',
  /** Text on a pale fill, for the second avatar and similar quiet badges. */
  indigo: '#5E5CE6',
  indigoSoft: 'rgba(94,92,230,0.14)',
} as const;

export const Radius = {
  card: 26,
  pill: 999,
  tile: 8,
} as const;

export const Spacing = {
  screen: 16,
  rowInset: 18,
} as const;
