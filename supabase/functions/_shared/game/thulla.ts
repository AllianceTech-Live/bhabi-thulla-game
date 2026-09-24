import { compareRanks } from './deck.ts';
import { Card, Suit, TrickPlay } from './types.ts';

/**
 * Highest card of the original lead suit among plays.
 * Returns null if no lead-suit cards were played (should not happen
 * when a Thulla occurs after at least one lead-suit play).
 */
export function getHighestLeadSuitCard(
  plays: TrickPlay[],
  leadSuit: Suit
): TrickPlay | null {
  const leadPlays = plays.filter((p) => p.card.suit === leadSuit);
  if (leadPlays.length === 0) return null;

  return leadPlays.reduce((best, play) =>
    compareRanks(play.card.rank, best.card.rank) > 0 ? play : best
  );
}

export interface ThullaResolution {
  /** Player who receives the entire pile into their hand */
  collectorId: string;
  /** Cards in the pile */
  pile: Card[];
  /** Was this a Thulla (off-suit) ending the trick early? */
  wasThulla: boolean;
}

/**
 * Resolve who picks up the pile after a Thulla.
 * The Thulla itself does NOT win — highest lead-suit card's
 * player takes the pile and becomes next leader.
 */
export function resolveThulla(
  plays: TrickPlay[],
  leadSuit: Suit
): ThullaResolution {
  const highest = getHighestLeadSuitCard(plays, leadSuit);
  if (!highest) {
    throw new Error('No lead-suit cards in Thulla trick');
  }

  return {
    collectorId: highest.playerId,
    pile: plays.map((p) => p.card),
    wasThulla: true,
  };
}

/**
 * Resolve a normal trick where everyone followed suit
 * (or played when lead was followed by all active players).
 * Winner = highest lead-suit card; cards are discarded.
 */
export function resolveNormalTrick(
  plays: TrickPlay[],
  leadSuit: Suit
): { winnerId: string; cards: Card[] } {
  const highest = getHighestLeadSuitCard(plays, leadSuit);
  if (!highest) {
    throw new Error('No lead-suit cards in normal trick');
  }

  return {
    winnerId: highest.playerId,
    cards: plays.map((p) => p.card),
  };
}

export function isThullaPlay(
  card: Card,
  leadSuit: Suit | null
): boolean {
  if (leadSuit === null) return false;
  return card.suit !== leadSuit;
}
