import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { Card } from '../../game/types';
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
  mini?: boolean;
  width?: number;
  height?: number;
  drop?: boolean;
  liftOnPress?: boolean;
  onPress?: (card: Card) => void;
}

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
 * Interactive playing card. Plain Pressable + animated child (reliable on web).
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
  const lift = useSharedValue(drop ? 12 : 0);
  const pressedAt = useRef(0);
  const { w, h } = sizeFor(compact, mini, width, height);

  useEffect(() => {
    if (selected) {
      lift.value = withSpring(-22, { damping: 14, stiffness: 180 });
    } else if (drop) {
      lift.value = withSpring(12, { damping: 16, stiffness: 180 });
    } else {
      lift.value = withSpring(0, { damping: 14, stiffness: 180 });
    }
  }, [selected, drop, lift]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  const handlePress = () => {
    const now = Date.now();
    // Short guard against accidental double-fire from pressIn+press
    if (now - pressedAt.current < 120) return;
    pressedAt.current = now;
    void triggerHaptic('selection');
    onPress?.(card);
  };

  if (faceDown) {
    return (
      <CardBackView width={w} height={h} glow={selected} muted={disabled} />
    );
  }

  return (
    <Pressable
      disabled={disabled || !onPress}
      onPress={handlePress}
      hitSlop={8}
      style={[
        styles.shadow,
        {
          width: w,
          height: h,
          borderRadius: h * 0.08,
          zIndex: selected ? 20 : 1,
          ...(Platform.OS === 'web' && onPress
            ? ({
                cursor: 'pointer',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              } as object)
            : null),
        },
        selected && styles.selected,
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={[{ width: w, height: h }, animStyle]}>
        <CardFace card={card} width={w} height={h} />
      </Animated.View>
    </Pressable>
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
