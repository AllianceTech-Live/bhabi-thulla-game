import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { formatCard } from '../../game/deck';
import type { Card, Suit, TrickPlay } from '../../game/types';
import { COLORS } from '../../constants/theme';
import { PlayingCard } from '../cards/PlayingCard';
import type { SeatOrigin } from './TrickPlayCard';

export interface ThullaMoment {
  plays: TrickPlay[];
  leadSuit: Suit;
  thullaPlayerId: string;
  thullaPlayerName: string;
  collectorId: string;
  collectorName: string;
  thullaCard: Card;
}

interface ThullaOverlayProps {
  moment: ThullaMoment;
  onDone: () => void;
  durationMs?: number;
  /** Seat of the player who collects the pile — cards fly here */
  collectorOrigin?: SeatOrigin;
}

/** Screen-relative destination for the collector seat */
function collectorTarget(
  origin: SeatOrigin,
  w: number,
  h: number
): { x: number; y: number } {
  switch (origin) {
    case 'top':
      return { x: 0, y: -h * 0.38 };
    case 'bottom':
      return { x: 0, y: h * 0.4 };
    case 'left':
      return { x: -w * 0.42, y: -h * 0.05 };
    case 'right':
      return { x: w * 0.42, y: -h * 0.05 };
  }
}

function FlyingThullaCard({
  play,
  index,
  total,
  target,
  flyDelay,
}: {
  play: TrickPlay;
  index: number;
  total: number;
  target: { x: number; y: number };
  flyDelay: number;
}) {
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);

  const spacing = 64;
  const startX = (index - (total - 1) / 2) * spacing;
  const startY = 0;
  // Stay centered as a pack; slight scatter then fly to collector
  const scatterX = (index - (total - 1) / 2) * 10;
  const scatterY = index % 2 === 0 ? -8 : 8;

  useEffect(() => {
    // Phase 1: brief shuffle / scatter
    shake.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(-1, { duration: 90 }),
      withTiming(1, { duration: 90 }),
      withTiming(0, { duration: 90 })
    );
    // Phase 2: fly to collector
    progress.value = withDelay(
      flyDelay,
      withTiming(1, {
        duration: 780,
        easing: Easing.in(Easing.cubic),
      })
    );
  }, [flyDelay, progress, shake]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const jiggle = shake.value * 6;
    return {
      opacity: interpolate(t, [0, 0.85, 1], [1, 1, 0.15]),
      transform: [
        {
          translateX: interpolate(
            t,
            [0, 0.22, 1],
            [startX + jiggle, scatterX, target.x]
          ),
        },
        {
          translateY: interpolate(
            t,
            [0, 0.22, 1],
            [startY, scatterY, target.y]
          ),
        },
        {
          rotate: `${interpolate(
            t,
            [0, 0.4, 1],
            [index * 4 - 6, (index - 1) * 18, (index - 1.5) * 12]
          )}deg`,
        },
        {
          scale: interpolate(t, [0, 0.35, 1], [1, 1.08, 0.35]),
        },
      ],
      zIndex: 10 + index,
    };
  });

  return (
    <Animated.View style={[styles.flyCard, style]}>
      <PlayingCard card={play.card} compact />
      {play.isThulla && (
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>THULLA</Text>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Thulla celebration: cards shuffle, then all suck toward the collector.
 */
export function ThullaOverlay({
  moment,
  onDone,
  durationMs = 3400,
  collectorOrigin = 'bottom',
}: ThullaOverlayProps) {
  const { width, height } = useWindowDimensions();
  const banner = useSharedValue(0);
  const target = collectorTarget(collectorOrigin, width, height);

  useEffect(() => {
    banner.value = withSequence(
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: durationMs - 700 }),
      withTiming(0, { duration: 280 })
    );
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [banner, durationMs, onDone]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: banner.value,
    transform: [
      { scale: interpolate(banner.value, [0, 1], [0.7, 1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(banner.value, [0, 0.4, 1], [0, 0, 1]),
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(220)}
      style={styles.overlay}
      pointerEvents="none"
    >
      <View style={styles.dim} />

      <Animated.View style={[styles.banner, bannerStyle]}>
        <Text style={styles.title}>THULLA!</Text>
        <Text style={styles.sub}>
          {moment.thullaPlayerName} played {formatCard(moment.thullaCard)}
        </Text>
      </Animated.View>

      {/* Cards gather then fly to collector */}
      <View style={styles.stage}>
        {moment.plays.map((play, index) => (
          <FlyingThullaCard
            key={`${play.playerId}-${play.card.id}`}
            play={play}
            index={index}
            total={moment.plays.length}
            target={target}
            flyDelay={420 + index * 70}
          />
        ))}
      </View>

      <Animated.View style={[styles.collectorWrap, labelStyle]}>
        <Text style={styles.collectorArrow}>
          {collectorOrigin === 'top'
            ? '↑'
            : collectorOrigin === 'bottom'
              ? '↓'
              : collectorOrigin === 'left'
                ? '←'
                : '→'}
        </Text>
        <Text style={styles.collector}>
          All cards → {moment.collectorName}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  banner: {
    position: 'absolute',
    top: '12%',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  title: {
    color: COLORS.thullaFlash,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sub: {
    color: COLORS.cream,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  stage: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  flyCard: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -28,
    marginTop: -40,
    alignItems: 'center',
  },
  cardBadge: {
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  cardBadgeText: {
    color: COLORS.thullaFlash,
    fontSize: 8,
    fontWeight: '800',
  },
  collectorWrap: {
    position: 'absolute',
    bottom: '14%',
    alignItems: 'center',
    backgroundColor: 'rgba(20,16,12,0.88)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    zIndex: 20,
  },
  collectorArrow: {
    color: COLORS.goldBright,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  collector: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
