import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="kvartalssjekk"
          // A page sheet, as in the design: the screen behind stays visible as a card at the top.
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
