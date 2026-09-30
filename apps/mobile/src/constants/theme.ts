export const Colors = {
  light: {
    text: '#111418',
    textSecondary: '#5B6470',
    background: '#FFFFFF',
    backgroundElement: '#F1F3F5',
    accent: '#1F6FEB',
    warning: '#B45309',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#A1A8B3',
    background: '#000000',
    backgroundElement: '#1C1F24',
    accent: '#6EA8FE',
    warning: '#F59E0B',
  },
} as const;

export type ThemeColors = (typeof Colors)['light' | 'dark'];

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;
