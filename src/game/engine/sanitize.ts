import type { Card, GameState, Player } from '../types';

/**
 * Strip private hands from players other than `viewerId`.
 * Used for client payloads — never trust the client with full state.
 */
export function sanitizeGameStateForPlayer(
  state: GameState,
  viewerId: string
): GameState {
  return {
    ...state,
    players: state.players.map((p) => sanitizePlayer(p, viewerId)),
    // Events may contain card ids from the open trick — that is public
  };
}

function sanitizePlayer(player: Player, viewerId: string): Player {
  if (player.id === viewerId) {
    return { ...player, hand: [...player.hand] };
  }
  // Replace with face-down placeholders (same count, opaque ids)
  const hiddenHand: Card[] = player.hand.map((_, i) => ({
    id: `hidden-${player.id}-${i}`,
    suit: 'spades',
    rank: '2',
  }));
  return {
    ...player,
    hand: hiddenHand,
  };
}

/** True public metadata without any card identities in hands */
export function getHandCounts(state: GameState): Record<string, number> {
  return Object.fromEntries(
    state.players.map((p) => [p.id, p.hand.length])
  );
}
