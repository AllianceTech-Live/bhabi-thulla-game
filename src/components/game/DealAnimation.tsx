import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CardBackView } from '../cards/CardBackView';
import { COLORS } from '../../constants/theme';
import { useTableBounds } from '../../hooks/useTableBounds';
import { playSfx } from '../../services/audio';
import { triggerHaptic } from '../../services/haptics';

const CARD_W = 48;
const CARD_H = 68;
const DECK_W = 52;
const DECK_H = 72;
/** Match each card's fly delay so SFX stops with the last deal. */
const DEAL_STAGGER_MS = 90;
/** Let the shuffle land before the first card flies. */
const DEAL_LEAD_MS = 280;

const SEAT_ORDER = ['top', 'left', 'right', 'bottom'] as const;

function dealSeatsForCount(count: number): (typeof SEAT_ORDER)[number][] {
  if (count <= 2) return ['bottom', 'top'];
  if (count === 3) return ['bottom', 'left', 'right'];
  return ['bottom', 'left', 'top', 'right'];
}

interface DealAnimationProps {
  playerCount: number;
  cardsPerPlayer: number;
  onComplete: () => void;
}

function DealCard({
  index,
  total,
  targetX,
  targetY,
  onLastArrive,
}: {
  index: number;
  total: number;
  targetX: number;
  targetY: number;
  onLastArrive: () => void;
}) {
  const progress = useSharedValue(0);
  const delay = DEAL_LEAD_MS + index * DEAL_STAGGER_MS;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: 420, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && index === total - 1) {
            runOnJS(onLastArrive)();
          }
        }
      )
    );
  }, [delay, index, onLastArrive, progress, total]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: 0.4 + t * 0.6,
      transform: [
        { translateX: targetX * t },
        { translateY: targetY * t },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.flyCard,
        {
          width: CARD_W,
          height: CARD_H,
          marginLeft: -CARD_W / 2,
          marginTop: -CARD_H / 2,
        },
        style,
      ]}
    >
      <CardBackView width={CARD_W} height={CARD_H} />
    </Animated.View>
  );
}

/**
 * Deck sits on the felt center; cards deal out to every seat from there.
 */
export function DealAnimation({
  playerCount,
  cardsPerPlayer,
  onComplete,
}: DealAnimationProps) {
  const { table, seats, onSceneLayout, ready } = useTableBounds();
  const [label, setLabel] = useState('Shuffling…');
  const totalCards = Math.min(playerCount * cardsPerPlayer, 52);
  const dealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const dealSeats = useMemo(
    () => dealSeatsForCount(playerCount),
    [playerCount]
  );

  const cards = useMemo(
    () =>
      Array.from({ length: totalCards }, (_, i) => ({
        id: i,
        seatKey: dealSeats[i % dealSeats.length]!,
      })),
    [dealSeats, totalCards]
  );

  const clearDealTimers = useCallback(() => {
    dealTimers.current.forEach(clearTimeout);
    dealTimers.current = [];
  }, []);

  useEffect(() => {
    setLabel('Dealing cards…');
    doneRef.current = false;
    void playSfx('shuffle');
    // One deal slap per card, timed to when that card leaves the deck.
    for (let i = 0; i < totalCards; i++) {
      const t = setTimeout(() => {
        void playSfx('card_deal');
      }, DEAL_LEAD_MS + i * DEAL_STAGGER_MS);
      dealTimers.current.push(t);
    }
    void triggerHaptic('light');
    return () => {
      clearDealTimers();
    };
  }, [clearDealTimers, totalCards]);

  const handleComplete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearDealTimers();
    setLabel('Ready!');
    void triggerHaptic('success');
    setTimeout(onComplete, 500);
  }, [clearDealTimers, onComplete]);

  const originX = table.centerX;
  const originY = table.centerY;

  return (
    <View
      style={styles.overlay}
      onLayout={onSceneLayout}
      pointerEvents="none"
    >
      <View style={styles.dim} />
      {ready ? (
        <>
          <View
            style={[
              styles.deckPile,
              {
                left: originX - DECK_W / 2,
                top: originY - DECK_H / 2,
                width: DECK_W,
                height: DECK_H,
              },
            ]}
          >
            <CardBackView width={DECK_W} height={DECK_H} />
          </View>
          {cards.map((c) => {
            const seat = seats[c.seatKey];
            return (
              <View
                key={c.id}
                style={[styles.originHub, { left: originX, top: originY }]}
              >
                <DealCard
                  index={c.id}
                  total={totalCards}
                  targetX={seat.x - originX}
                  targetY={seat.y - originY}
                  onLastArrive={handleComplete}
                />
              </View>
            );
          })}
          <Text
            style={[
              styles.label,
              { top: originY + DECK_H / 2 + 16 },
            ]}
          >
            {label}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 21, 16, 0.45)',
  },
  deckPile: {
    position: 'absolute',
    zIndex: 2,
  },
  originHub: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 3,
  },
  flyCard: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    zIndex: 4,
  },
});
