/**
 * Expo config — dynamic so AdMob App IDs can come from EAS env.
 * @type {import('expo/config').ExpoConfig}
 */
/** Real AdMob Android App ID (Bhabi Thulla Card Game). */
const androidAppId =
  process.env.ADMOB_ANDROID_APP_ID ||
  'ca-app-pub-3712201782893807~2590167527';
/** Real AdMob iOS App ID (Bhabi Thulla Card Game). */
const iosAppId =
  process.env.ADMOB_IOS_APP_ID ||
  'ca-app-pub-3712201782893807~1348236026';

module.exports = {
  expo: {
    name: 'Bhabi Thulla',
    slug: 'bhabi-thulla',
    version: '1.0.1',
    orientation: 'landscape',
    icon: './assets/images/icon.png',
    scheme: 'bhabithulla',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bhabithulla.app',
      requireFullScreen: true,
      appleTeamId: '7THPVD8QX7',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#073D32',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      package: 'com.bhabithulla.app',
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'com.google.android.gms.permission.AD_ID',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
      meta: {
        viewport:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-asset',
      './plugins/withAdIdPermission',
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'LANDSCAPE',
        },
      ],
      [
        'expo-navigation-bar',
        {
          backgroundColor: '#062820',
          barStyle: 'light',
          enforceContrast: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#062820',
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: false,
          recordAudioAndroid: false,
          enableBackgroundPlayback: false,
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          // Real Android App ID; set ADMOB_IOS_APP_ID for production iOS.
          androidAppId,
          iosAppId,
          userTrackingUsageDescription:
            'This identifier may be used to show you relevant ads. You can still play without personalized ads.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'c3db0a4f-5302-49d4-a0de-cb2a01c58318',
      },
    },
    owner: 'pakrice',
  },
};
