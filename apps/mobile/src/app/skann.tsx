import type { BarcodeScanningResult } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deliverBarcode } from '@/lib/scanner';

const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 160;

export default function SkannModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned || !data) return;
      setScanned(true);

      const handled = deliverBarcode(data);
      if (!handled && params.returnTo) {
        router.navigate({
          pathname: params.returnTo as any,
          params: { barcode: data },
        });
      } else {
        router.back();
      }
    },
    [scanned, params.returnTo],
  );

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner' }} size={32} color={Colors.accent} />
          </View>
          <Text style={styles.permissionTitle}>Trenger tilgang til kameraet</Text>
          <Text style={styles.permissionMessage}>
            Appen bruker kameraet til å skanne strekkoder på varer du legger til i beredskapslageret.
          </Text>
          <View style={styles.permissionButtons}>
            <PrimaryButton
              label={permission.canAskAgain ? 'Gi tilgang' : 'Åpne innstillinger'}
              onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
            />
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Avbryt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Top controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Lukk"
          style={styles.roundButton}>
          <Icon name={{ ios: 'xmark', android: 'close' }} size={18} color="#FFFFFF" />
        </Pressable>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Skann strekkode</Text>
        </View>

        <Pressable
          onPress={() => setTorch((t) => !t)}
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Slå av lommelykt' : 'Slå på lommelykt'}
          style={[styles.roundButton, torch && styles.roundButtonActive]}>
          <Icon
            name={
              torch
                ? { ios: 'flashlight.on.fill', android: 'flashlight_on' }
                : { ios: 'flashlight.off.fill', android: 'flashlight_off' }
            }
            size={18}
            color={torch ? Colors.accent : '#FFFFFF'}
          />
        </Pressable>
      </View>

      {/* Viewfinder overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.maskTop} />
        <View style={styles.maskCenterRow}>
          <View style={styles.maskSide} />
          <View style={styles.reticleContainer}>
            <View style={styles.reticleFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLine} />
            </View>
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={styles.maskBottom}>
          <Text style={styles.hint}>Hold strekkoden innenfor rammen</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screen,
  },
  permissionCard: {
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.label,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 15,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: 8,
  },
  textButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 16,
    color: Colors.secondaryLabel,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    zIndex: 10,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  maskCenterRow: {
    height: FRAME_HEIGHT,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  reticleContainer: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  reticleFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    width: FRAME_WIDTH - 32,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    paddingTop: 28,
  },
  hint: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
