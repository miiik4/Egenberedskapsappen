import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Two builds of the same app, side by side on one phone:
 * - production: the real app, on the prod Firebase project, as it goes to the App Store
 *   and Google Play
 * - development (the default): `.dev` IDs, the test Firebase project, «dev» in the name
 *
 * Production has to be asked for (`APP_VARIANT=production`, set by the store build profile),
 * so a stray local build can never write into the real project.
 */
const production = process.env.APP_VARIANT === 'production';

/**
 * Dev clients run JS from Metro, and a build that checks update signatures makes Metro sign
 * every manifest with the release key. `UPDATE_SIGNING=off` leaves the check out of a dev
 * client: set by the `development` profiles in eas.json and by `npm run ios` / `android`. Never
 * set for preview, production or `eas update`, which must keep it (docs/releasing.md).
 */
const unsignedDevClient = process.env.UPDATE_SIGNING === 'off';

export default ({ config }: ConfigContext): ExpoConfig => {
  const id = production ? 'no.htas.egenberedskap' : 'no.htas.egenberedskap.dev';
  const firebase = production ? 'prod' : 'test';

  return {
    ...config,
    name: production ? config.name! : `${config.name} dev`,
    slug: config.slug!,
    scheme: production ? 'egenberedskapsappen' : 'egenberedskapsappen-dev',
    ios: {
      ...config.ios,
      // The home-screen name is short (app.json); «dev» tells the two builds apart.
      infoPlist: production
        ? config.ios?.infoPlist
        : {
            ...config.ios?.infoPlist,
            CFBundleDisplayName: `${config.ios?.infoPlist?.CFBundleDisplayName} dev`,
          },
      bundleIdentifier: id,
      googleServicesFile: `./firebase/${firebase}/GoogleService-Info.plist`,
    },
    android: {
      ...config.android,
      package: id,
      googleServicesFile: `./firebase/${firebase}/google-services.json`,
    },
    extra: { ...config.extra, variant: production ? 'production' : 'development' },
    ...(unsignedDevClient && !production && { updates: withoutSigning(config.updates) }),
  };
};

function withoutSigning(updates: ExpoConfig['updates']): ExpoConfig['updates'] {
  if (!updates) return updates;
  const { codeSigningCertificate: _certificate, codeSigningMetadata: _metadata, ...rest } = updates;
  return rest;
}
