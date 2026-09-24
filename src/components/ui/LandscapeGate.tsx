import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

/**
 * Web phones can stay in portrait; the game is landscape-only.
 * Block interaction and ask them to rotate until width > height.
 */
export function LandscapeGate() {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') return null;
  if (width >= height) return null;

  return (
    <View style={styles.root} accessibilityRole="alert" pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.glyph}>↻</Text>
        <Text style={styles.title}>Rotate your phone</Text>
        <Text style={styles.body}>
          Bhabi Thulla plays in landscape. Turn your device sideways to continue.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 200000,
    backgroundColor: 'rgba(4, 25, 16, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(8, 14, 12, 0.95)',
  },
  glyph: {
    color: COLORS.gold,
    fontSize: 42,
    marginBottom: 12,
    lineHeight: 48,
  },
  title: {
    color: COLORS.cream,
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    color: 'rgba(247,241,227,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
