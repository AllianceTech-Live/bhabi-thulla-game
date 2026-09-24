import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { TrickPlay } from '../../game/types';
import { GAME_THEME } from '../../constants/gameTheme';
import { GAME_TIMING } from '../../constants/timing';
import { playSfx } from '../../services/audio';
import { PlayingCard } from '../cards/PlayingCard';

export type SeatOrigin = 'bottom' | 'top' | 'left' | 'right';

const ORIGIN_OFFSET: Record<SeatOrigin, { x: number; y: number }> = {
  bottom: { x: 0, y: 56 },
  top: { x: 0, y: -56 },
  left: { x: -60, y: 0 },
  right: { x: 60, y: 0 },
};

interface TrickPlayCardProps {
  play: TrickPlay;
  origin: SeatOrigin;
  index: number;
  total: number;
  cardWidth?: number;
  cardHeight?: number;
  collectX?: number;
  collectY?: number;
  onCollected?: () => void;
}

/** Presentation fly-in. A Thulla lifts big, hits the table, then the pile can leave. */
export function TrickPlayCard({
  play,
  origin,
  index,
  total,
  cardWidth,
  cardHeight,
  collectX,
  collectY,
  onCollected,
}: TrickPlayCardProps) {
  const collecting = collectX != null && collectY != null;
  const latest = index === total - 1;
  const isThulla = play.isThulla;
  const progress = useSharedValue(collecting ? 1 : 0);
  const settle = useSharedValue(latest || isThulla ? 1 : 0);
  const slam = useSharedValue(collecting && isThulla ? 1 : 0);
  const fly = useSharedValue(0);
  const doneRef = useRef(onCollected);
  doneRef.current = onCollected;
  const notify = useCallback(() => {
    doneRef.current?.();
  }, []);
  const shoutThulla = useCallback(() => {
    void playSfx('thulla');
  }, []);
  const hitTable = useCallback(() => {
    void playSfx('card_play');
  }, []);
  const start = ORIGIN_OFFSET[origin];

  useEffect(() => {
    if (collecting) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: GAME_TIMING.cardPlayAnimMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [collecting, play.card.id, play.playerId, progress]);

  useEffect(() => {
    if (collecting) return;
    settle.value = withTiming(latest || isThulla ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [collecting, isThulla, latest, settle]);

  useEffect(() => {
    if (collecting || !isThulla) {
      if (collecting && isThulla) slam.value = 1;
      return;
    }
    slam.value = 0;
    const liftDelay = Math.round(GAME_TIMING.cardPlayAnimMs * 0.4);
    // 0 → peak (held big) → slam down
    slam.value = withDelay(
      liftDelay,
      withSequence(
        withTiming(0.42, {
          duration: 320,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.42, { duration: 220 }),
        withTiming(1, {
          duration: 280,
          easing: Easing.in(Easing.cubic),
        })
      )
    );
    const shoutAt = liftDelay + 40;
    const hitAt = liftDelay + 320 + 220 + Math.round(280 * 0.85);
    const shoutTimer = setTimeout(() => shoutThulla(), shoutAt);
    const hitTimer = setTimeout(() => hitTable(), hitAt);
    return () => {
      clearTimeout(shoutTimer);
      clearTimeout(hitTimer);
    };
  }, [collecting, hitTable, isThulla, play.card.id, shoutThulla, slam]);

  useEffect(() => {
    if (!collecting) {
      fly.value = 0;
      return;
    }
    fly.value = 0;
    fly.value = withDelay(
      80 + index * 45,
      withTiming(
        1,
        { duration: 700, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished && index === total - 1) {
            runOnJS(notify)();
          }
        }
      )
    );
  }, [collectX, collectY, collecting, fly, index, notify, total]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const gone = fly.value;
    const s = slam.value;
    const dx = collectX ?? 0;
    const dy = collectY ?? 0;
    // Peak around 0.42: high + big; then drop through 0.7 bounce into 1
    const slamY = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 0.9, 1], [0, -110, 22, -4, 0])
      : 0;
    const slamScale = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 1], [1, 2.05, 0.9, 1])
      : 1;
    return {
      opacity: collecting
        ? interpolate(gone, [0, 0.72, 1], [1, 1, 0])
        : interpolate(settle.value, [0, 1], [0.92, 1]),
      transform: [
        {
          translateX: interpolate(t, [0, 1], [start.x, 0]) + dx * gone,
        },
        {
          translateY:
            interpolate(t, [0, 1], [start.y, 0]) + slamY + dy * gone,
        },
        { scale: slamScale },
      ],
    };
  });

  const badgeStyle = useAnimatedStyle(() => {
    if (!isThulla || collecting) {
      return { opacity: 0, transform: [{ translateY: 8 }] };
    }
    const s = slam.value;
    return {
      opacity: interpolate(s, [0, 0.2, 0.7, 1], [0, 1, 1, 0.85]),
      transform: [
        {
          translateY: interpolate(s, [0, 0.42, 1], [18, -8, 0]),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        style,
        {
          zIndex: collecting
            ? 40 + index
            : isThulla
              ? 50
              : latest
                ? 30
                : index + 1,
        },
        (latest || isThulla) && !collecting && styles.lifted,
        isThulla && !collecting && styles.thullaGlow,
      ]}
    >
      <PlayingCard card={play.card} width={cardWidth} height={cardHeight} />
      {isThulla ? (
        <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none">
          <Text style={styles.badgeText}>THULLA!</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  lifted: {
    shadowColor: '#F0D58A',
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  thullaGlow: {
    shadowColor: GAME_THEME.colors.goldLight,
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  badge: {
    position: 'absolute',
    top: -18,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(8,11,11,0.92)',
    borderWidth: 1,
    borderColor: GAME_THEME.colors.gold,
  },
  badgeText: {
    color: GAME_THEME.colors.goldLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: GAME_THEME.fonts.display,
  },
});
