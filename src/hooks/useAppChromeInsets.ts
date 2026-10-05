import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAndroidImmersivePath } from '../services/immersiveChrome';

/** Reliable top inset on Android when the status bar is visible. */
export function androidVisibleStatusInset(insetsTop: number): number {
  if (Platform.OS !== 'android') return insetsTop;
  return Math.max(insetsTop, RNStatusBar.currentHeight ?? 24);
}

/**
 * Safe area for menus and tables — immersive game flow on Android drops the
 * status-bar inset; home/settings keep system chrome like iOS.
 */
export function useAppChromeInsets() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const immersive = Platform.OS === 'android' && isAndroidImmersivePath(pathname);
  const visibleTop = androidVisibleStatusInset(insets.top);

  return {
    top: immersive ? 8 : visibleTop,
    bottom: Math.max(insets.bottom, 4),
    left: insets.left,
    right: insets.right,
    immersive,
  };
}
