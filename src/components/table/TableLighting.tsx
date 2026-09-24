import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { GAME_THEME } from '../../constants/gameTheme';

interface TableLightingProps {
  /** Soft ambient pulse */
  animate?: boolean;
  highlightCenter?: boolean;
}

/**
 * Radial spotlight + vignette over the felt.
 * Very subtle — no heavy continuous motion by default.
 */
export function TableLighting({
  animate = true,
  highlightCenter = false,
}: TableLightingProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    pulse.value = withRepeat(
      withTiming(1.06, {
        duration: 4200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [animate, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (highlightCenter ? 0.55 : 0.32) * pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  const { colors } = GAME_THEME;

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.spotlight, glowStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="feltSpot" cx="50%" cy="48%" rx="42%" ry="48%">
              <Stop offset="0%" stopColor="#1A6B54" stopOpacity="0.55" />
              <Stop offset="45%" stopColor={colors.feltLight} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={colors.felt} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="100" cy="60" rx="96" ry="56" fill="url(#feltSpot)" />
        </Svg>
      </Animated.View>

      <Svg
        style={styles.fill}
        width="100%"
        height="100%"
        viewBox="0 0 200 120"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient id="feltVignette" cx="50%" cy="50%" rx="58%" ry="62%">
            <Stop offset="55%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="100" cy="60" rx="100" ry="60" fill="url(#feltVignette)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: GAME_THEME.layers.tableDecorations,
  },
  spotlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
