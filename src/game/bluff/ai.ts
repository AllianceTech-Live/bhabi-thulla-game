import type { BluffActionResult, BluffState } from './types';
import type { Rank } from '../types';
import { RANKS } from '../types';
import { callBluff, playBluffCards } from './engine';

/**
 * Simple Bluff AI: sometimes tell truth, sometimes lie; call when pile is big.
 */
export function chooseBluffAction(
  state: BluffState,
  playerId: string
): BluffActionResult {
  const me = state.players.find((p) => p.id === playerId);
  if (!me || state.currentTurnPlayerId !== playerId) {
    return { success: false, error: 'Not AI turn', state };
  }

  // Call bluff ~35% if there is a last play and pile >= 3
  if (state.lastPlay && state.lastPlay.playerId !== playerId) {
    const callChance = state.pile.length >= 6 ? 0.55 : 0.28;
    if (Math.random() < callChance) {
      return callBluff(state, playerId);
    }
  }

  const required = state.requiredRank;
  const truthCards = required
    ? me.hand.filter((c) => c.rank === required)
    : [];

  let claimedRank: Rank;
  let cardIds: string[];

  if (required) {
    claimedRank = required;
    if (truthCards.length > 0 && Math.random() < 0.65) {
      const n = Math.min(4, truthCards.length, 1 + Math.floor(Math.random() * 2));
      cardIds = truthCards.slice(0, n).map((c) => c.id);
    } else {
      // Lie with 1–2 random cards
      const n = Math.min(2, me.hand.length);
      cardIds = me.hand.slice(0, Math.max(1, n)).map((c) => c.id);
    }
  } else {
    // Free claim — prefer a rank we hold
    const byRank = new Map<Rank, typeof me.hand>();
    for (const c of me.hand) {
      const list = byRank.get(c.rank) ?? [];
      list.push(c);
      byRank.set(c.rank, list);
    }
    let best: Rank = RANKS[0]!;
    let bestN = 0;
    for (const r of RANKS) {
      const n = byRank.get(r)?.length ?? 0;
      if (n > bestN) {
        bestN = n;
        best = r;
      }
    }
    claimedRank = bestN > 0 ? best : me.hand[0]!.rank;
    const pool = byRank.get(claimedRank) ?? [me.hand[0]!];
    const n = Math.min(4, pool.length);
    cardIds = pool.slice(0, Math.max(1, n)).map((c) => c.id);
  }

  return playBluffCards(state, playerId, cardIds, claimedRank);
}
