// Keeps stored documents out of Android's cloud backup and device-to-device transfer.
// Everything else the app stores is still backed up.
//
// If expo-secure-store is added later, it brings its own backup rules for the same manifest
// attributes: merge its exclusions into the files below instead of letting one overwrite the other.
const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

// Paths.document on Android is the app's filesDir, which backup rules call the "file" domain.
const EXCLUDE = '<exclude domain="file" path="dokumenter/" />';

const FILES = {
  // Android 11 and earlier.
  'backup_rules.xml': `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  ${EXCLUDE}
</full-backup-content>
`,
  // Android 12 and later.
  'data_extraction_rules.xml': `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    ${EXCLUDE}
  </cloud-backup>
  <device-transfer>
    ${EXCLUDE}
  </device-transfer>
</data-extraction-rules>
`,
};

module.exports = function withDocumentBackupExclusion(config) {
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, contents] of Object.entries(FILES)) fs.writeFileSync(path.join(dir, name), contents);
      return config;
    },
  ]);
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$['android:fullBackupContent'] = '@xml/backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    return config;
  });
};
