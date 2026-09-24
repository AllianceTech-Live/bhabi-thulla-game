import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Card, Suit } from '../../game/types';
import { getPlayableCards } from '../../game/rules/playable';
import { PlayingCard } from '../cards/PlayingCard';
import { CARD_STYLE } from '../cards/cardStyle';
import { GAME_THEME } from '../../constants/gameTheme';

const LIFT_ROOM = 28;
const DROP_ROOM = 14;

interface PlayerHandProps {
  hand: Card[];
  leadSuit: Suit | null;
  selectedId: string | null;
  interactive: boolean;
  onSelect: (card: Card) => void;
  hidden?: boolean;
  compact?: boolean;
  liftOnPress?: boolean;
}

/**
 * Local hand fan — presentation only.
 * Playability comes from existing getPlayableCards / interactive flags.
 */
export function PlayerHand({
  hand,
  leadSuit,
  selectedId,
  interactive,
  onSelect,
  hidden,
  compact = false,
  liftOnPress = false,
}: PlayerHandProps) {
  const { width, height } = useWindowDimensions();
  const long = Math.max(width, height);
  const playable = interactive
    ? new Set(getPlayableCards(hand, leadSuit).map((c) => c.id))
    : new Set<string>();

  const cardW = compact ? CARD_STYLE.sizes.compact.w : CARD_STYLE.sizes.default.w;
  const cardH = compact ? CARD_STYLE.sizes.compact.h : CARD_STYLE.sizes.default.h;
  const handHeight = cardH + LIFT_ROOM + DROP_ROOM + 8;

  const overlapMargin = useMemo(() => {
    if (hand.length <= 1) return 2;
    const avail = Math.max(200, long * 0.52);
    const peek = Math.max(22, Math.min(34, cardW * 0.42));
    const totalIfPeek = cardW + (hand.length - 1) * peek;
    if (totalIfPeek <= avail) {
      return -(cardW - peek);
    }
    const spacing = (avail - cardW) / (hand.length - 1);
    return -(cardW - Math.max(20, spacing));
  }, [hand.length, long, cardW]);

  if (hand.length === 0) {
    return (
      <View style={[styles.empty, { height: handHeight }]}>
        <Text style={styles.emptyText}>No cards</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ height: handHeight }}
      contentContainerStyle={[
        styles.row,
        { minHeight: handHeight, paddingTop: LIFT_ROOM, paddingBottom: DROP_ROOM },
      ]}
      nestedScrollEnabled
    >
      {hand.map((card, i) => {
        const legal = interactive && playable.has(card.id);
        return (
          <View
            key={card.id}
            style={[
              styles.slot,
              {
                marginLeft: i === 0 ? 0 : overlapMargin,
                zIndex: selectedId === card.id ? 30 : i + 1,
                height: cardH,
              },
            ]}
          >
            {hidden ? (
              <PlayingCard card={card} faceDown compact={compact} />
            ) : (
              <PlayingCard
                card={card}
                selected={legal && selectedId === card.id}
                drop={!legal}
                compact={compact}
                liftOnPress={liftOnPress}
                onPress={legal ? onSelect : undefined}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  slot: {
    justifyContent: 'flex-end',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    color: GAME_THEME.colors.ivory,
    opacity: 0.45,
    fontSize: 12,
  },
});
