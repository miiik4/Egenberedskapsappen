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
  warningText: '#A35200',
  warningSoft: 'rgba(255,159,10,0.16)',

  // Icon tiles, like in Settings.
  tileOrange: '#FF9F0A',
  tileRed: '#FF3B30',
  tileBlue: '#0E5FC0',

  // The days card on Home stays dark in both modes.
  hero: {
    background: '#0B2B4A',
    text: '#FFFFFF',
    muted: '#BBD6F2',
    soft: '#DCEBFA',
    track: '#23517C',
    bar: '#5FA3F0',
    caption: '#A9C5DD',
    divider: '#2D5D8A',
  },
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
