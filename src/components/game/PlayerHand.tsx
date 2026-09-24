import React, { useMemo } from 'react';
import {
  Platform,
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
  /** Multi-select (Bluff). When set, overrides single selectedId highlight. */
  selectedIds?: string[];
  interactive: boolean;
  onSelect: (card: Card) => void;
  hidden?: boolean;
  compact?: boolean;
  liftOnPress?: boolean;
  /** When set, only these card ids are playable (e.g. opening Ace of Spades). */
  playableIds?: string[] | null;
}

/**
 * Local hand fan — presentation only.
 * Playability comes from existing getPlayableCards / interactive flags.
 */
export function PlayerHand({
  hand,
  leadSuit,
  selectedId,
  selectedIds,
  interactive,
  onSelect,
  hidden,
  compact = false,
  liftOnPress = false,
  playableIds = null,
}: PlayerHandProps) {
  const { width, height } = useWindowDimensions();
  const long = Math.max(width, height);
  const selectedSet = useMemo(
    () => new Set(selectedIds ?? (selectedId ? [selectedId] : [])),
    [selectedIds, selectedId]
  );
  const playable = useMemo(() => {
    if (!interactive) return new Set<string>();
    if (playableIds) return new Set(playableIds);
    return new Set(getPlayableCards(hand, leadSuit).map((c) => c.id));
  }, [interactive, playableIds, hand, leadSuit]);

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

  const cards = hand.map((card, i) => {
    const legal = interactive && playable.has(card.id);
    const isSelected = selectedSet.has(card.id);
    return (
      <View
        key={card.id}
        // Web: wider hit target so overlapping fan peeks stay clickable
        style={[
          styles.slot,
          {
            marginLeft: i === 0 ? 0 : overlapMargin,
            zIndex: isSelected ? 40 : i + 1,
            height: cardH + LIFT_ROOM,
            paddingTop: LIFT_ROOM,
          },
        ]}
      >
        {hidden ? (
          <PlayingCard card={card} faceDown compact={compact} />
        ) : (
          <PlayingCard
            card={card}
            selected={legal && isSelected}
            drop={!legal}
            compact={compact}
            liftOnPress={liftOnPress}
            onPress={legal ? onSelect : undefined}
          />
        )}
      </View>
    );
  });

  const rowStyle = [
    styles.row,
    { minHeight: handHeight, paddingTop: 0, paddingBottom: DROP_ROOM },
  ];

  // Web ScrollView often swallows the 2nd click — use a plain row instead.
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webRow,
          { height: handHeight, maxWidth: long * 0.72 },
        ]}
      >
        <View style={rowStyle}>{cards}</View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ height: handHeight }}
      contentContainerStyle={rowStyle}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {cards}
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
  webRow: {
    alignSelf: 'center',
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? ({ touchAction: 'manipulation' } as object)
      : null),
  },
  slot: {
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web'
      ? ({ touchAction: 'manipulation' } as object)
      : null),
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
