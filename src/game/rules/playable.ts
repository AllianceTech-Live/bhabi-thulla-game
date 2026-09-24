import { Card, Suit } from '../types';

/**
 * Follow-suit rule:
 * - If no lead suit yet (leading the trick), any card is legal.
 * - If player has at least one card of lead suit → ONLY those are legal.
 * - If player has none of lead suit → any card is legal (Thulla).
 */
export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null
): Card[] {
  if (hand.length === 0) return [];
  if (leadSuit === null) return [...hand];

  const ofLead = hand.filter((c) => c.suit === leadSuit);
  if (ofLead.length > 0) return ofLead;
  return [...hand];
}

export function isLegalMove(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null
): boolean {
  if (!hand.some((c) => c.id === card.id)) {
    return false;
  }
  return getPlayableCards(hand, leadSuit).some((c) => c.id === card.id);
}

export function wouldBeThulla(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null
): boolean {
  if (leadSuit === null) return false;
  const hasLead = hand.some((c) => c.suit === leadSuit);
  return !hasLead && card.suit !== leadSuit;
}
