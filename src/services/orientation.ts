import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

/**
 * Force landscape for the whole app. Re-apply after navigation / resume —
 * iOS can briefly unlock when leaving a screen.
 * On web: try the browser lock (works on some Android PWAs / fullscreen);
 * LandscapeGate still covers portrait phones where lock is unavailable.
 */
export async function lockLandscapeOrientation(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await ScreenOrientation.lockPlatformAsync({
        screenOrientationLockWeb: ScreenOrientation.WebOrientationLock.LANDSCAPE,
      });
      return;
    }

    if (Platform.OS === 'ios') {
      await ScreenOrientation.lockPlatformAsync({
        screenOrientationArrayIOS: [
          ScreenOrientation.Orientation.LANDSCAPE_LEFT,
          ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
        ],
      });
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    }
  } catch {
    try {
      if (Platform.OS !== 'web') {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      }
    } catch {
      // Expo Go / Safari web — lock unsupported
    }
  }
}
