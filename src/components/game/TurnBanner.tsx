import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';

type TurnBannerProps = {
  /** Short name of the player whose turn it is */
  name: string;
  /** True when it is the local player's turn */
  isYou?: boolean;
  /** Optional seconds left on the clock */
  secondsLeft?: number | null;
};

/**
 * High-visibility “whose turn” banner for the table HUD.
 */
export function TurnBanner({ name, isYou, secondsLeft }: TurnBannerProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [pulse, name, isYou]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const short = (name || 'Player').trim().slice(0, 12);
  const label = isYou ? 'YOUR TURN' : `${short.toUpperCase()}'S TURN`;
  const urgent =
    typeof secondsLeft === 'number' && secondsLeft > 0 && secondsLeft <= 5;

  return (
    <Animated.View
      style={[
        styles.wrap,
        isYou ? styles.wrapYou : styles.wrapOther,
        urgent && styles.wrapUrgent,
        anim,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.dot, isYou && styles.dotYou, urgent && styles.dotUrgent]} />
      <Text style={[styles.text, urgent && styles.textUrgent]} numberOfLines={1}>
        {label}
      </Text>
      {typeof secondsLeft === 'number' && secondsLeft >= 0 ? (
        <View style={[styles.timer, urgent && styles.timerUrgent]}>
          <Text style={[styles.timerText, urgent && styles.timerTextUrgent]}>
            {secondsLeft}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    maxWidth: 280,
  },
  wrapYou: {
    backgroundColor: 'rgba(214,175,85,0.28)',
    borderColor: ART_DECO_PALETTE.gold,
  },
  wrapOther: {
    backgroundColor: 'rgba(8,12,14,0.88)',
    borderColor: 'rgba(214,175,85,0.55)',
  },
  wrapUrgent: {
    backgroundColor: 'rgba(80,18,14,0.92)',
    borderColor: '#E85D4C',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ART_DECO_PALETTE.goldLight,
  },
  dotYou: {
    backgroundColor: ART_DECO_PALETTE.online,
  },
  dotUrgent: {
    backgroundColor: '#E85D4C',
  },
  text: {
    flexShrink: 1,
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  textUrgent: {
    color: '#FFD0C8',
  },
  timer: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.5)',
    alignItems: 'center',
  },
  timerUrgent: {
    borderColor: '#E85D4C',
  },
  timerText: {
    color: ART_DECO_PALETTE.ivory,
    fontWeight: '900',
    fontSize: 12,
  },
  timerTextUrgent: {
    color: '#FFD0C8',
  },
});
