// Asking for location makes Google Play assume the phone must have GPS, and hide the app from
// devices without it (8 devices on 2026-10-26, mostly tablets). Location only sorts the shelter
// list, which still works without it, so the hardware is declared optional.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURES = ['android.hardware.location', 'android.hardware.location.gps', 'android.hardware.location.network'];

module.exports = function withOptionalLocationHardware(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const declared = (manifest['uses-feature'] ??= []);
    for (const name of FEATURES) {
      const existing = declared.find((feature) => feature.$['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else declared.push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return config;
  });
};
