import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
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
const THROW_DEDUP_MS = 8000;

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

/** Start offsets — from each seat toward the center pile. */
const ORIGIN_OFFSET: Record<SeatOrigin, { x: number; y: number; rot: number }> =
  {
    bottom: { x: 0, y: 118, rot: -8 },
    top: { x: 0, y: -150, rot: 10 },
    left: { x: -140, y: 28, rot: -18 },
    right: { x: 140, y: 28, rot: 18 },
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
  /** Your card — continuous lift from hand (matches offline). */
  fromHandThrow?: boolean;
}

/**
 * One throw animation per card for this trick.
 * Flight includes a real flip (back → face) so it reads like a table throw.
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
  fromHandThrow = false,
}: TrickPlayCardProps) {
  const collecting = collectX != null && collectY != null;
  const latest = index === total - 1;
  const isThulla = play.isThulla;
  const playKey = `${play.playerId}:${play.card.id}`;
  const mayAnimateRef = useRef<boolean | null>(null);
  if (mayAnimateRef.current === null) {
    mayAnimateRef.current = claimThrowAnimation(playKey);
  }
  const mayAnimate = mayAnimateRef.current;
  const throwStarted = useRef(false);
  const slamRan = useRef(false);

  const progress = useSharedValue(collecting || !mayAnimate ? 1 : 0);
  const settle = useSharedValue(latest || isThulla ? 1 : 0);
  const slam = useSharedValue(
    collecting && isThulla ? 1 : mayAnimate ? 0 : isThulla ? 1 : 0
  );
  const fly = useSharedValue(0);

  const doneRef = useRef(onCollected);
  doneRef.current = onCollected;
  const notify = useCallback(() => {
    doneRef.current?.();
  }, []);
  const shoutSlam = useCallback(() => {
    // Voice is played by the game screen when thullaMoment starts so every
    // client hears it — not only the device that animated the throw.
    if (slamStyle === 'bluff') void playSfx('bluff');
  }, [slamStyle]);
  const hitTable = useCallback(() => {
    void playSfx('card_play');
  }, []);

  const start = fromHandThrow
    ? { x: 0, y: 44, rot: -5 }
    : ORIGIN_OFFSET[origin];
  const badgeLabel = slamStyle === 'bluff' ? 'BLUFF!' : 'THULLA!';
  const throwMs = GAME_TIMING.cardPlayAnimMs;
  const w = cardWidth ?? 66;
  const h = cardHeight ?? 88;
  const flipThrow =
    mayAnimate && !fromHandThrow && origin !== 'bottom' && !faceDown;

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
    if (fromHandThrow) {
      progress.value = withSpring(
        1,
        {
          damping: 22,
          stiffness: 128,
          mass: 0.82,
          overshootClamping: true,
        },
        (finished) => {
          if (finished && !isThulla) {
            runOnJS(hitTable)();
          }
        }
      );
    } else {
      progress.value = withTiming(1, {
        duration: throwMs,
        easing: Easing.bezier(0.22, 0.9, 0.28, 1),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
  }, []);

  useEffect(() => {
    if (collecting) return;
    settle.value = withTiming(latest || isThulla ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [collecting, isThulla, latest, settle]);

  useEffect(() => {
    if (!isThulla || collecting || slamRan.current) {
      if (isThulla && collecting) slam.value = 1;
      return;
    }
    slamRan.current = true;

    const liftDelay = mayAnimate
      ? Math.round(throwMs * 0.55)
      : 120;
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
  }, [collecting, hitTable, isThulla, mayAnimate, shoutSlam, slam, throwMs]);

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
    const arc = fromHandThrow
      ? interpolate(t, [0, 0.35, 1], [0, -38, 0])
      : interpolate(t, [0, 0.4, 1], [0, -56, 0]);
    const bounce = !isThulla
      ? interpolate(t, [0, 0.8, 0.9, 1], [0, 0, 5, 0])
      : 0;
    const slamY = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 0.9, 1], [0, -110, 22, -4, 0])
      : 0;
    const slamScale = isThulla
      ? interpolate(s, [0, 0.42, 0.78, 1], [1, 2.05, 0.9, 1])
      : 1;
    const throwScale = fromHandThrow
      ? interpolate(t, [0, 0.3, 1], [1, 1.04, 1])
      : interpolate(t, [0, 0.25, 0.7, 1], [0.92, 1.08, 1.02, 1]);
    // Wrist twist into the table
    const rotZ = interpolate(t, [0, 0.45, 1], [start.rot, start.rot * 0.25, 0]);
    // Full flip for opponents; local throw keeps the face they selected
    const flipY = flipThrow
      ? interpolate(t, [0, 0.55, 1], [180, 90, 0])
      : 0;

    return {
      opacity: collecting
        ? interpolate(gone, [0, 0.72, 1], [1, 1, 0])
        : fromHandThrow
          ? 1
          : interpolate(t, [0, 0.08, 1], [0, 1, 1]),
      transform: [
        { perspective: 900 },
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
        { rotateZ: `${rotZ}deg` },
        { rotateY: `${flipY}deg` },
        { scale: throwScale * slamScale },
      ],
    };
  });

  // Swap faces at the flip midpoint (reliable vs backfaceVisibility on Android)
  const faceStyle = useAnimatedStyle(() => {
    if (faceDown || !mayAnimate) {
      return { opacity: faceDown ? 0 : 1 };
    }
    if (!flipThrow) return { opacity: 1 };
    const flipY = interpolate(progress.value, [0, 0.55, 1], [180, 90, 0]);
    return { opacity: flipY < 90 ? 1 : 0 };
  });

  const backStyle = useAnimatedStyle(() => {
    if (faceDown) return { opacity: 1 };
    if (!mayAnimate || !flipThrow) return { opacity: 0 };
    const flipY = interpolate(progress.value, [0, 0.55, 1], [180, 90, 0]);
    return { opacity: flipY >= 90 ? 1 : 0 };
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
          width: w,
          height: h,
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
      <Animated.View style={[styles.face, backStyle]} pointerEvents="none">
        <CardBackView width={w} height={h} />
      </Animated.View>
      {!faceDown ? (
        <Animated.View style={[styles.face, faceStyle]} pointerEvents="none">
          <PlayingCard card={play.card} width={w} height={h} />
        </Animated.View>
      ) : null}
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
    justifyContent: 'center',
  },
  face: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
