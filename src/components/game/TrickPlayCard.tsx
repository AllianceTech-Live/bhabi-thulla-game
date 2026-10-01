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
import { CardBackView } from '../cards/CardBackView';

export type SeatOrigin = 'bottom' | 'top' | 'left' | 'right';

/** Survive optimistic→server remounts without replaying the same throw. */
const thrownOnce = new Map<string, number>();
const THROW_DEDUP_MS = 4000;

function claimThrowAnimation(playKey: string): boolean {
  const now = Date.now();
  const prev = thrownOnce.get(playKey);
  if (prev != null && now - prev < THROW_DEDUP_MS) return false;
  thrownOnce.set(playKey, now);
  if (thrownOnce.size > 48) {
    for (const [k, t] of thrownOnce) {
      if (now - t > THROW_DEDUP_MS) thrownOnce.delete(k);
    }
  }
  return true;
}

/** Clear throw memory when a trick leaves the table. */
export function clearThrowAnimationMemory() {
  thrownOnce.clear();
}

const ORIGIN_OFFSET: Record<SeatOrigin, { x: number; y: number; rot: number }> =
  {
    bottom: { x: 0, y: 130, rot: -8 },
    top: { x: 0, y: -120, rot: 8 },
    left: { x: -110, y: 20, rot: -14 },
    right: { x: 110, y: 20, rot: 14 },
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
  faceDown?: boolean;
  slamStyle?: 'thulla' | 'bluff';
}

/**
 * One throw animation per card, ever, for this trick.
 * Changing `latest` / `total` must NOT restart the flight (that made both
 * cards re-throw when the second player played).
 */
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
  faceDown = false,
  slamStyle = 'thulla',
}: TrickPlayCardProps) {
  const collecting = collectX != null && collectY != null;
  const latest = index === total - 1;
  const isThulla = play.isThulla;
  const playKey = `${play.playerId}:${play.card.id}`;
  const mayAnimate = useRef(claimThrowAnimation(playKey)).current;
  const throwStarted = useRef(false);

  const progress = useSharedValue(collecting || !mayAnimate ? 1 : 0);
  const settle = useSharedValue(latest || isThulla ? 1 : 0);
  const slam = useSharedValue(collecting && isThulla ? 1 : mayAnimate ? 0 : isThulla ? 1 : 0);
  const fly = useSharedValue(0);

  const doneRef = useRef(onCollected);
  doneRef.current = onCollected;
  const notify = useCallback(() => {
    doneRef.current?.();
  }, []);
  const shoutSlam = useCallback(() => {
    void playSfx(slamStyle === 'bluff' ? 'bluff' : 'thulla');
  }, [slamStyle]);
  const hitTable = useCallback(() => {
    void playSfx('card_play');
  }, []);

  const start = ORIGIN_OFFSET[origin];
  const badgeLabel = slamStyle === 'bluff' ? 'BLUFF!' : 'THULLA!';
  const throwMs = GAME_TIMING.cardPlayAnimMs;

  // Throw flight — mount once only. Never re-run when `latest` flips.
  useEffect(() => {
    if (collecting) {
      progress.value = 1;
      return;
    }
    if (!mayAnimate || throwStarted.current) {
      progress.value = 1;
      return;
    }
    throwStarted.current = true;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: throwMs,
      easing: Easing.bezier(0.22, 0.9, 0.28, 1),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
  }, []);

  // Soft highlight when this is the newest card — no flight restart
  useEffect(() => {
    if (collecting) return;
    settle.value = withTiming(latest || isThulla ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [collecting, isThulla, latest, settle]);

  // Thulla slam — one-shot with the throw, not when latest changes
  useEffect(() => {
    if (!mayAnimate || !isThulla || collecting) {
      if (isThulla) slam.value = collecting || !mayAnimate ? 1 : slam.value;
      return;
    }
    if (throwStarted.current && slam.value > 0) return;

    const liftDelay = Math.round(throwMs * 0.55);
    slam.value = 0;
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
    const shoutTimer = setTimeout(() => shoutSlam(), shoutAt);
    const hitTimer = setTimeout(() => hitTable(), hitAt);
    return () => {
      clearTimeout(shoutTimer);
      clearTimeout(hitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
  }, []);

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
    const arc = interpolate(t, [0, 0.45, 1], [0, -42, 0]);
    const bounce = !isThulla
      ? interpolate(t, [0, 0.82, 0.92, 1], [0, 0, 6, 0])
      : 0;
    const slamY = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 0.9, 1], [0, -110, 22, -4, 0])
      : 0;
    const slamScale = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 1], [1, 2.05, 0.9, 1])
      : 1;
    const throwScale = interpolate(t, [0, 0.35, 0.85, 1], [1.12, 1.06, 0.97, 1]);
    const rot = interpolate(t, [0, 0.55, 1], [start.rot, start.rot * 0.35, 0]);

    return {
      opacity: collecting
        ? interpolate(gone, [0, 0.72, 1], [1, 1, 0])
        : interpolate(t, [0, 0.12, 1], [0, 1, 1]),
      transform: [
        {
          translateX: interpolate(t, [0, 1], [start.x, 0]) + dx * gone,
        },
        {
          translateY:
            interpolate(t, [0, 1], [start.y, 0]) +
            arc +
            bounce +
            slamY +
            dy * gone,
        },
        { rotate: `${rot}deg` },
        { scale: throwScale * slamScale },
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
      {faceDown ? (
        <CardBackView width={cardWidth ?? 66} height={cardHeight ?? 88} />
      ) : (
        <PlayingCard card={play.card} width={cardWidth} height={cardHeight} />
      )}
      {isThulla && !faceDown && latest ? (
        <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none">
          <Text style={styles.badgeText}>{badgeLabel}</Text>
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
