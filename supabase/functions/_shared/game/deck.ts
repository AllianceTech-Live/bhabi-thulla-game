import {
  ACE_OF_SPADES_ID,
  Card,
  RANK_VALUES,
  RANKS,
  Rank,
  SUITS,
  Suit,
} from './types.ts';

/** Create a standard 52-card deck (no jokers). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function cardEquals(a: Card, b: Card): boolean {
  return a.id === b.id;
}

export function isAceOfSpades(card: Card): boolean {
  return card.id === ACE_OF_SPADES_ID;
}

export function compareRanks(a: Rank, b: Rank): number {
  return RANK_VALUES[a] - RANK_VALUES[b];
}

export function compareCards(a: Card, b: Card): number {
  if (a.suit !== b.suit) {
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  }
  return compareRanks(a.rank, b.rank);
}

/** Sort hand by suit then rank (ascending) for clean UI. */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort(compareCards);
}

/**
 * Deal all cards as evenly as possible among players.
 * Remainder cards go to the first seats (seat order).
 * Never silently discards cards.
 */
export function dealCards(
  deck: Card[],
  playerCount: number
): Card[][] {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2–4, got ${playerCount}`);
  }
  if (deck.length !== 52) {
    throw new Error(`Expected 52-card deck, got ${deck.length}`);
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands.map(sortHand);
}

export function findPlayerWithAceOfSpades(
  hands: { id: string; hand: Card[] }[]
): string | null {
  for (const player of hands) {
    if (player.hand.some(isAceOfSpades)) {
      return player.id;
    }
  }
  return null;
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
  }
}

export function formatCard(card: Card): string {
  return `${getSuitSymbol(card.suit)}${card.rank}`;
}
