import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Card } from '../../game/types';
import { GAME_TIMING } from '../../constants/timing';
import { triggerHaptic } from '../../services/haptics';
import { CARD_STYLE } from './cardStyle';
import { CardFace } from './CardFace';
import { CardBackView } from './CardBackView';

interface PlayingCardProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  compact?: boolean;
  /** Mini size for opponent fans */
  mini?: boolean;
  /** Drawn size for a fixed table slot. Not a scale transform. */
  width?: number;
  height?: number;
  /** Sit lower and ignore taps. Playable cards stay up and can lift. */
  drop?: boolean;
  /** Lift slightly, then fire onPress (tap-to-play feel) */
  liftOnPress?: boolean;
  onPress?: (card: Card) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function sizeFor(
  compact?: boolean,
  mini?: boolean,
  width?: number,
  height?: number
) {
  if (width && height) return { w: width, h: height };
  if (mini) return CARD_STYLE.sizes.mini;
  if (compact) return CARD_STYLE.sizes.compact;
  return CARD_STYLE.sizes.default;
}

/**
 * Interactive playing card. Faces are SVG/code-rendered (all 52 from CardFace).
 * Backs use Asset #4 production raster.
 */
export function PlayingCard({
  card,
  selected,
  disabled,
  faceDown,
  compact,
  mini,
  width,
  height,
  drop = false,
  liftOnPress = false,
  onPress,
}: PlayingCardProps) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(drop ? 12 : 0);
  const { w, h } = sizeFor(compact, mini, width, height);

  useEffect(() => {
    if (selected) {
      lift.value = withSpring(-18, { damping: 14, stiffness: 180 });
    } else if (drop) {
      lift.value = withSpring(12, { damping: 16, stiffness: 180 });
    } else if (!liftOnPress) {
      lift.value = withSpring(0, { damping: 14, stiffness: 180 });
    }
  }, [selected, drop, lift, liftOnPress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
    zIndex: selected || lift.value < -4 ? 20 : 1,
  }));

  if (faceDown) {
    return (
      <CardBackView
        width={w}
        height={h}
        glow={selected}
        muted={disabled}
      />
    );
  }

  return (
    <AnimatedPressable
      disabled={disabled || !onPress}
      onPressIn={() => {
        scale.value = 0.98;
      }}
      onPressOut={() => {
        scale.value = 1;
      }}
      onPress={async () => {
        await triggerHaptic('selection');
        if (liftOnPress) {
          lift.value = withTiming(-26, {
            duration: GAME_TIMING.cardLiftMs,
            easing: Easing.out(Easing.cubic),
          });
          setTimeout(() => {
            onPress?.(card);
          }, GAME_TIMING.cardLiftMs);
          return;
        }
        onPress?.(card);
      }}
      style={[
        styles.shadow,
        { width: w, height: h, borderRadius: h * 0.08 },
        selected && styles.selected,
        disabled && styles.disabled,
        animStyle,
      ]}
    >
      <CardFace card={card} width={w} height={h} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  selected: {
    shadowColor: CARD_STYLE.selectedGlow,
    shadowOpacity: 0.65,
    shadowRadius: 10,
  },
  disabled: {
    opacity: 0.42,
  },
});
