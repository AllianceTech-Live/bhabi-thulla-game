import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GAME_ASSETS } from '../../constants/gameAssets';
import { GAME_THEME } from '../../constants/gameTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { cachedAssetSource } from '../../services/preloadAssets';

interface GameBackgroundProps {
  children?: React.ReactNode;
}

/**
 * Asset #1 environment — dark Art Deco lounge behind the table.
 * Falls back to gradient vignette when the raster is letterboxed.
 */
export function GameBackground({ children }: GameBackgroundProps) {
  const { colors, layers } = GAME_THEME;
  const { width, height } = useWindowDimensions();
  const short = Math.min(width, height);
  const darkMode = useSettingsStore((s) => s.darkMode);

  return (
    <View style={[styles.root, { zIndex: layers.background }]}>
      <Image
        source={cachedAssetSource(GAME_ASSETS.environment)}
        style={styles.env}
        resizeMode="cover"
        fadeDuration={0}
        accessibilityIgnoresInvertColors
      />

      {/* Same lounge vignette as home — readable chrome over Asset #1 */}
      <LinearGradient
        colors={
          darkMode
            ? [
                'rgba(4,21,16,0.35)',
                'rgba(4,21,16,0.15)',
                'rgba(4,21,16,0.72)',
                'rgba(4,12,10,0.92)',
              ]
            : [
                'rgba(255,244,220,0.22)',
                'rgba(255,248,230,0.1)',
                'rgba(4,21,16,0.45)',
                'rgba(4,12,10,0.78)',
              ]
        }
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Warm lamp bloom (left) matching Asset #1 */}
      <View
        style={[
          styles.lampGlow,
          {
            width: short * 0.38,
            height: short * 0.38,
            top: -short * 0.12,
            left: -short * 0.1,
            backgroundColor: darkMode
              ? colors.lampGlow
              : 'rgba(255, 220, 140, 0.42)',
          },
        ]}
        pointerEvents="none"
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_THEME.colors.room,
  },
  env: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  lampGlow: {
    position: 'absolute',
    borderRadius: 999,
  },
});
