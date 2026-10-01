import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/ui/AppButton';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { showAd } from '@/src/services/ads';

const { colors } = GAME_THEME;

const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.15;
  const dist = 90 + (i % 5) * 28;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 0.75,
    size: i % 3 === 0 ? 10 : 5,
    delay: (i % 7) * 40,
    color: i % 2 === 0 ? colors.goldLight : colors.ivory,
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
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.7, 1], [0, 1, 0.7, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, x]) },
      { translateY: interpolate(t.value, [0, 1], [0, y]) },
      { scale: interpolate(t.value, [0, 0.3, 1], [0.4, 1.15, 0.6]) },
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

export type GameOverOutcome = 'win' | 'lose' | 'over';

type GameOverScreenProps = {
  outcome: GameOverOutcome;
  title: string;
  subtitle?: string;
  detail?: string;
  onHome: () => void;
  onPlayAgain?: () => void;
  children?: React.ReactNode;
};

/**
 * Full-screen win / lose celebration with Home CTA.
 */
export function GameOverScreen({
  outcome,
  title,
  subtitle,
  detail,
  onHome,
  onPlayAgain,
  children,
}: GameOverScreenProps) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);
  const isWin = outcome === 'win';
  const isLose = outcome === 'lose';

  useEffect(() => {
    pulse.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 800,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [pulse]);

  useEffect(() => {
    const t = setTimeout(() => {
      void showAd('between_rounds_interstitial');
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const gradient = isWin
    ? (['rgba(8,40,28,0.96)', 'rgba(4,18,14,0.98)', '#060708'] as const)
    : isLose
      ? (['rgba(60,18,14,0.96)', 'rgba(20,8,8,0.98)', '#060708'] as const)
      : (['rgba(20,18,10,0.96)', 'rgba(8,9,9,0.98)', '#060708'] as const);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <LinearGradient colors={[...gradient]} style={StyleSheet.absoluteFill} />

      {isWin ? (
        <View style={styles.sparkField} pointerEvents="none">
          {SPARKS.map((s, i) => (
            <Spark key={i} {...s} />
          ))}
        </View>
      ) : null}

      <Animated.View entering={FadeIn.duration(400)} style={styles.brand}>
        <Text style={styles.brandText}>BHABI THULLA</Text>
      </Animated.View>

      <Animated.View
        entering={ZoomIn.delay(120).springify().damping(12)}
        style={[styles.badgeWrap, badgeStyle]}
      >
        <View
          style={[
            styles.badge,
            isWin && styles.badgeWin,
            isLose && styles.badgeLose,
          ]}
        >
          <Text style={styles.badgeEmoji}>{isWin ? '★' : isLose ? '♛' : '◆'}</Text>
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(220).duration(420)}
        style={[styles.title, isLose && styles.titleLose]}
      >
        {title}
      </Animated.Text>

      {subtitle ? (
        <Animated.Text
          entering={FadeInDown.delay(320).duration(400)}
          style={styles.subtitle}
        >
          {subtitle}
        </Animated.Text>
      ) : null}

      {detail ? (
        <Animated.Text
          entering={FadeIn.delay(420).duration(400)}
          style={styles.detail}
        >
          {detail}
        </Animated.Text>
      ) : null}

      {children ? (
        <Animated.View
          entering={FadeInUp.delay(480).duration(420)}
          style={styles.body}
        >
          {children}
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInUp.delay(560).duration(420)}
        style={styles.actions}
      >
        <AppButton title="HOME" onPress={onHome} style={styles.homeBtn} />
        {onPlayAgain ? (
          <AppButton
            title="PLAY AGAIN"
            variant="secondary"
            onPress={onPlayAgain}
            style={styles.againBtn}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sparkField: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
  },
  brand: {
    marginBottom: 10,
  },
  brandText: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 3,
  },
  badgeWrap: {
    marginBottom: 14,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(214,175,85,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ART_DECO_PALETTE.goldLight,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  badgeWin: {
    backgroundColor: 'rgba(0,200,83,0.18)',
    borderColor: '#3DDC97',
  },
  badgeLose: {
    backgroundColor: 'rgba(232,93,76,0.2)',
    borderColor: '#E85D4C',
  },
  badgeEmoji: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 36,
    fontWeight: '900',
  },
  title: {
    color: colors.ivory,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  titleLose: {
    color: '#FF8A7A',
  },
  subtitle: {
    marginTop: 8,
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    marginTop: 6,
    color: 'rgba(247,241,227,0.55)',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
  },
  body: {
    width: '100%',
    maxWidth: 360,
    marginTop: 18,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    marginTop: 22,
    gap: 10,
    alignItems: 'stretch',
  },
  homeBtn: {
    width: '100%',
  },
  againBtn: {
    width: '100%',
  },
});
