import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { GAME_THEME } from '../../constants/gameTheme';
import { playSfx } from '../../services/audio';

const SUITS = ['♠', '♥', '♦', '♣'] as const;

type AnimatedSplashProps = {
  onDone: () => void;
};

/**
 * In-app animated splash after the native splash hides.
 * Presentation only — delays the first screen briefly.
 */
export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const veil = useSharedValue(1);
  const brand = useSharedValue(0);
  const ring = useSharedValue(0);
  const suits = useSharedValue(0);

  useEffect(() => {
    void playSfx('game_start');
    brand.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    ring.value = withDelay(
      120,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    suits.value = withDelay(
      280,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })
    );
    veil.value = withDelay(
      1680,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) })
    );
    const done = setTimeout(onDone, 2140);
    return () => clearTimeout(done);
  }, [brand, onDone, ring, suits, veil]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: veil.value,
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brand.value,
    transform: [
      { translateY: interpolate(brand.value, [0, 1], [18, 0]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value,
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.72, 1]) }],
  }));

  return (
    <Animated.View style={[styles.root, veilStyle]} pointerEvents="auto">
      <LinearGradient
        colors={['#041910', '#073D32', '#062820']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.lamp} pointerEvents="none" />

      <Animated.View style={[styles.ring, ringStyle]} />

      <Animated.View style={[styles.brandBlock, brandStyle]}>
        <Text style={styles.eyebrow}>CARD TABLE</Text>
        <Text style={styles.title}>BHABI THULLA</Text>
        <View style={styles.rule}>
          <View style={styles.ruleLine} />
          <Text style={styles.gem}>◆</Text>
          <View style={styles.ruleLine} />
        </View>
        <Text style={styles.tag}>Play · Think · Outlast</Text>
      </Animated.View>

      <View style={styles.suitRow}>
        {SUITS.map((suit, i) => (
          <SuitGlyph key={suit} suit={suit} index={i} progress={suits} />
        ))}
      </View>
    </Animated.View>
  );
}

function SuitGlyph({
  suit,
  index,
  progress,
}: {
  suit: (typeof SUITS)[number];
  index: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const local = Math.max(
      0,
      Math.min(1, (progress.value - index * 0.12) / 0.55)
    );
    return {
      opacity: local,
      transform: [{ translateY: interpolate(local, [0, 1], [16, 0]) }],
    };
  });
  const red = suit === '♥' || suit === '♦';
  return (
    <Animated.Text style={[styles.suit, red && styles.suitRed, style]}>
      {suit}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#062820',
  },
  lamp: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    left: -30,
    backgroundColor: 'rgba(240,200,120,0.16)',
  },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.45)',
  },
  brandBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: ART_DECO_PALETTE.goldMid,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: GAME_THEME.fonts.display,
    textAlign: 'center',
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 180,
    marginTop: 10,
    marginBottom: 8,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214,175,85,0.55)',
  },
  gem: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 8,
  },
  tag: {
    color: 'rgba(247,241,227,0.55)',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  suitRow: {
    position: 'absolute',
    bottom: '18%',
    flexDirection: 'row',
    gap: 18,
  },
  suit: {
    color: ART_DECO_PALETTE.ivory,
    fontSize: 26,
    fontWeight: '700',
  },
  suitRed: {
    color: ART_DECO_PALETTE.suitRed,
  },
});
