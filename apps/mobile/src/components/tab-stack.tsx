import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** The stack inside each tab: native large titles on the grouped background, no hairline. */
export function TabStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
