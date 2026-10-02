const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Ensure AD_ID is in the merged manifest for Play Console + AdMob.
 * @param {import('expo/config-plugins').ExpoConfig} config
 */
function withAdIdPermission(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const perms = manifest['uses-permission'];
    const name = 'com.google.android.gms.permission.AD_ID';
    const exists = perms.some(
      (p) => p.$?.['android:name'] === name
    );
    if (!exists) {
      perms.push({ $: { 'android:name': name } });
    }
    return cfg;
  });
}

module.exports = withAdIdPermission;
