import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { SourceSans3_400Regular } from '@expo-google-fonts/source-sans-3/400Regular';
import { SourceSans3_500Medium } from '@expo-google-fonts/source-sans-3/500Medium';
import { SourceSans3_600SemiBold } from '@expo-google-fonts/source-sans-3/600SemiBold';
import { SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3/700Bold';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnalysisProvider } from '@/analysis/analysis-provider';
import { BackupProvider } from '@/backup/backup-provider';
import { DataProvider, useData } from '@/data/data-provider';
import { DocumentLockProvider } from '@/documents/lock';
import { NotificationsProvider } from '@/notifications/notifications-provider';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  // The brand's typefaces, bundled with the app. Nothing shows until they're in, so no screen
  // flashes in the system font first; a font that fails to load falls back to it.
  const [fontsLoaded, fontError] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
        <DataProvider>
          <NotificationsProvider>
            <DocumentLockProvider>
              <BackupProvider>
                <AnalysisProvider>
                  <Routes />
                </AnalysisProvider>
              </BackupProvider>
            </DocumentLockProvider>
          </NotificationsProvider>
        </DataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Forms and the beredskapssjekk are page sheets, as in the design: the screen behind
// stays visible as a card at the top.
const sheet = { presentation: 'modal' } as const;

function Routes() {
  const { onboarded } = useData();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="velkommen" />
        <Stack.Screen name="gjenopprett" options={sheet} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="beredskapssjekk" options={sheet} />
        <Stack.Screen name="vare" options={sheet} />
        <Stack.Screen name="kontakt" options={sheet} />
        <Stack.Screen name="motested" options={sheet} />
        <Stack.Screen name="rom" options={sheet} />
        <Stack.Screen name="gjenstand" options={sheet} />
        <Stack.Screen name="rapport" options={sheet} />
        <Stack.Screen name="film/index" options={sheet} />
        <Stack.Screen name="film/[id]" options={sheet} />
        <Stack.Screen name="film/forslag" options={sheet} />
        <Stack.Screen name="film/video" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="eiendom" options={sheet} />
        <Stack.Screen name="forsikring" options={sheet} />
        <Stack.Screen name="dokument" options={sheet} />
        <Stack.Screen name="sikkerhetskopi" options={sheet} />
        <Stack.Screen name="skader" options={sheet} />
        <Stack.Screen name="skade" options={sheet} />
        <Stack.Screen name="skade-ting" options={sheet} />
        <Stack.Screen name="fil" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      {/* Last, so it's never the fallback a guard redirects to. */}
      <Stack.Screen name="utvikling" />
    </Stack>
  );
}
