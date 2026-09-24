import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplash } from '@/src/components/ui/AnimatedSplash';
import { COLORS } from '@/src/constants/theme';
import { initAudio, resetAudio } from '@/src/services/audio';
import { loadPlayerName } from '@/src/services/online';
import { lockLandscapeOrientation } from '@/src/services/orientation';
import { preloadGameAssets } from '@/src/services/preloadAssets';

SplashScreen.preventAutoHideAsync();
void preloadGameAssets();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.tableFeltDeep,
    card: COLORS.tableFelt,
    primary: COLORS.gold,
    text: COLORS.cream,
    border: COLORS.tableEdge,
  },
};

const LANDSCAPE_SCREENS = [
  'index',
  'play',
  'mode',
  'offline/setup',
  'online/index',
          'online/create',
          'online/join',
          'online/match',
          'lobby/[code]',
  'game/local',
  'game/bluff-local',
  'game/[id]',
  'game/results',
  'game/pause',
  'rules/index',
  'settings/index',
  'stats/index',
] as const;

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    void resetAudio();
    void initAudio();
    void loadPlayerName();
    void lockLandscapeOrientation();
    void preloadGameAssets().finally(() => {
      void SplashScreen.hideAsync().finally(() => setReady(true));
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void lockLandscapeOrientation();
    });

    const orientSub = ScreenOrientation.addOrientationChangeListener((ev) => {
      const o = ev.orientationInfo.orientation;
      if (
        o === ScreenOrientation.Orientation.PORTRAIT_UP ||
        o === ScreenOrientation.Orientation.PORTRAIT_DOWN
      ) {
        void lockLandscapeOrientation();
      }
    });

    return () => {
      appSub.remove();
      ScreenOrientation.removeOrientationChangeListener(orientSub);
    };
  }, []);

  // Re-lock after every navigation (exit game → menus).
  useEffect(() => {
    void lockLandscapeOrientation();
    const t = setTimeout(() => void lockLandscapeOrientation(), 120);
    return () => clearTimeout(t);
  }, [pathname]);

  const onSplashDone = useCallback(() => setShowSplash(false), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            orientation: 'landscape',
          }}
        >
          {LANDSCAPE_SCREENS.map((name) => (
            <Stack.Screen
              key={name}
              name={name}
              options={{ orientation: 'landscape' }}
            />
          ))}
        </Stack>
        {ready && showSplash ? (
          <AnimatedSplash onDone={onSplashDone} />
        ) : null}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
