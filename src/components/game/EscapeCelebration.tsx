import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GAME_THEME } from '../../constants/gameTheme';

const HOLD_MS = 2600;

const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2) * 0.2;
  const dist = 78 + (i % 4) * 26;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 0.72,
    size: i % 3 === 0 ? 9 : 5,
    delay: (i % 6) * 35,
    color: i % 2 === 0 ? GAME_THEME.colors.goldLight : GAME_THEME.colors.ivory,
  };
});

function Spark({
  x,
  y,
  size,
  delay,
  color,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 980, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 1, 0.85, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, x]) },
      { translateY: interpolate(t.value, [0, 1], [0, y]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Shown when the local player's hand is empty. Presentation only. */
export function EscapeCelebration({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  const title = useSharedValue(0);

  useEffect(() => {
    title.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(t);
  }, [onDone, title]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: interpolate(title.value, [0, 1], [16, 0]) }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.dim} />
      <View style={styles.burst}>
        {SPARKS.map((spark, i) => (
          <Spark key={i} {...spark} />
        ))}
      </View>
      <Animated.View style={[styles.card, titleStyle]}>
        <Text style={styles.kicker}>✦</Text>
        <Text style={styles.title}>You made it</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>All your cards are gone</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: GAME_THEME.layers.modal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  burst: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(8,11,11,0.92)',
    borderWidth: 1.5,
    borderColor: GAME_THEME.colors.gold,
  },
  kicker: {
    color: GAME_THEME.colors.goldLight,
    fontSize: 18,
    marginBottom: 2,
  },
  title: {
    color: GAME_THEME.colors.goldLight,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.4,
    fontFamily: GAME_THEME.fonts.display,
  },
  name: {
    color: GAME_THEME.colors.ivory,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  sub: {
    color: 'rgba(247,241,227,0.72)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
