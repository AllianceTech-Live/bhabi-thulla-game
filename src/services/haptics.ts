import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export type HapticKind =
  | 'light'
  | 'medium'
  | 'success'
  | 'warning'
  | 'selection';

export async function triggerHaptic(kind: HapticKind): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!useSettingsStore.getState().hapticsEnabled) return;

  try {
    switch (kind) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        break;
      case 'warning':
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // Device may not support haptics
  }
}
