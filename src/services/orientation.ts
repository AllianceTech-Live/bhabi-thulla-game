import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

/**
 * Force landscape for the whole app. Re-apply after navigation / resume —
 * iOS can briefly unlock when leaving a screen.
 */
export async function lockLandscapeOrientation(): Promise<void> {
  try {
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
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    } catch {
      // Web / Expo Go edge cases
    }
  }
}
