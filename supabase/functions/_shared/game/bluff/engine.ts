import { createDeck, dealCards, sortHandByRank } from '../deck.ts';
import { shuffleDeck } from '../shuffle.ts';
import type { Card, Rank } from '../types.ts';
import { MAX_PLAYERS, MIN_PLAYERS, RANKS } from '../types.ts';
import type {
  BluffActionResult,
  BluffPhase,
  BluffPlay,
  BluffPlayer,
  BluffState,
  CreateBluffOptions,
} from './types.ts';

function now() {
  return Date.now();
}

function clone(state: BluffState): BluffState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
    })),
    pile: [...state.pile],
    lastPlay: state.lastPlay
      ? {
          ...state.lastPlay,
          cardIds: [...state.lastPlay.cardIds],
          actualCards: [...state.lastPlay.actualCards],
        }
      : null,
    events: [...state.events],
  };
}

function activePlayers(state: BluffState): BluffPlayer[] {
  return state.players.filter((p) => p.finishOrder == null && p.hand.length > 0);
}

function nextActive(
  state: BluffState,
  fromId: string
): BluffPlayer | null {
  const ordered = [...state.players].sort((a, b) => a.seat - b.seat);
  const idx = ordered.findIndex((p) => p.id === fromId);
  if (idx < 0) return null;
  for (let i = 1; i <= ordered.length; i++) {
    const p = ordered[(idx + i) % ordered.length]!;
    if (p.finishOrder == null && p.hand.length > 0) return p;
  }
  return null;
}

function pushEvent(
  state: BluffState,
  type: string,
  payload?: Record<string, unknown>
) {
  state.events.push({ type, payload, timestamp: now() });
  state.updatedAt = now();
}

function checkFinishes(state: BluffState, playerId: string) {
  const p = state.players.find((x) => x.id === playerId);
  if (!p || p.hand.length > 0 || p.finishOrder != null) return;

  const finished = state.players.filter((x) => x.finishOrder != null).length;
  p.finishOrder = finished + 1;
  pushEvent(state, 'player_out', { playerId, place: p.finishOrder });

  if (p.finishOrder === 1) {
    state.winnerId = playerId;
  }

  const stillIn = state.players.filter(
    (x) => x.finishOrder == null && x.hand.length > 0
  );
  if (stillIn.length <= 1) {
    state.phase = 'game_complete';
    if (stillIn.length === 1) {
      state.loserId = stillIn[0]!.id;
      stillIn[0]!.finishOrder = state.players.length;
    }
    pushEvent(state, 'game_complete', {
      winnerId: state.winnerId,
      loserId: state.loserId,
    });
    state.currentTurnPlayerId = null;
  }
}

/** Create and deal a Bluff table. */
export function createBluffGame(options: CreateBluffOptions): BluffState {
  const { playerConfigs, randomFn, gameId } = options;
  const n = playerConfigs.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new Error(`Bluff needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  }

  const deck = shuffleDeck(createDeck(), randomFn);
  const hands = dealCards(deck, n);

  const players: BluffPlayer[] = playerConfigs.map((cfg, i) => ({
    id: cfg.id,
    name: cfg.name,
    seat: i + 1,
    type: cfg.type,
    hand: sortHandByRank(hands[i] ?? []),
    aiDifficulty: cfg.aiDifficulty,
    finishOrder: null,
  }));

  const starter = players[0]!;

  return {
    id: gameId ?? `bluff-${now()}`,
    kind: 'bluff',
    phase: 'playing',
    players,
    currentTurnPlayerId: starter.id,
    pile: [],
    lastPlay: null,
    requiredRank: null,
    events: [{ type: 'deal', timestamp: now() }],
    winnerId: null,
    loserId: null,
    createdAt: now(),
    updatedAt: now(),
  };
}

/**
 * Play 1–4 cards face-down claiming `claimedRank`.
 * If requiredRank is set, claim must match it.
 */
export function playBluffCards(
  state: BluffState,
  playerId: string,
  cardIds: string[],
  claimedRank: Rank
): BluffActionResult {
  const next = clone(state);
  if (next.phase !== 'playing') {
    return { success: false, error: 'Not accepting plays', state: next };
  }
  if (next.currentTurnPlayerId !== playerId) {
    return { success: false, error: 'Not your turn', state: next };
  }
  if (cardIds.length < 1 || cardIds.length > 4) {
    return { success: false, error: 'Play 1 to 4 cards', state: next };
  }
  if (!RANKS.includes(claimedRank)) {
    return { success: false, error: 'Invalid rank', state: next };
  }
  if (next.requiredRank && claimedRank !== next.requiredRank) {
    return {
      success: false,
      error: `Must claim ${next.requiredRank}`,
      state: next,
    };
  }

  const player = next.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found', state: next };

  const cards: Card[] = [];
  for (const id of cardIds) {
    const idx = player.hand.findIndex((c) => c.id === id);
    if (idx < 0) {
      return { success: false, error: 'Card not in hand', state: next };
    }
    cards.push(player.hand[idx]!);
  }

  // Remove from hand
  player.hand = sortHandByRank(
    player.hand.filter((c) => !cardIds.includes(c.id))
  );

  const play: BluffPlay = {
    playerId,
    cardIds: [...cardIds],
    claimedRank,
    actualCards: cards,
  };

  next.pile.push(...cards);
  next.lastPlay = play;
  next.requiredRank = claimedRank;
  pushEvent(next, 'bluff_play', {
    playerId,
    count: cards.length,
    claimedRank,
  });

  checkFinishes(next, playerId);
  if ((next.phase as BluffPhase) === 'game_complete') {
    return { success: true, state: next };
  }

  const nxt = nextActive(next, playerId);
  next.currentTurnPlayerId = nxt?.id ?? null;
  return { success: true, state: next };
}

/**
 * Call bluff on the last play. Wrong caller takes the pile; liar takes it if caught.
 * Successful challenger (or truth-teller) leads next with free rank.
 */
export function callBluff(
  state: BluffState,
  callerId: string
): BluffActionResult {
  const next = clone(state);
  if (next.phase !== 'playing') {
    return { success: false, error: 'Cannot call now', state: next };
  }
  if (!next.lastPlay) {
    return { success: false, error: 'Nothing to call', state: next };
  }
  if (next.lastPlay.playerId === callerId) {
    return { success: false, error: 'Cannot call your own play', state: next };
  }
  // Anyone still in may call (classic table shout) — prefer current turn
  const caller = next.players.find((p) => p.id === callerId);
  if (!caller || caller.finishOrder != null) {
    return { success: false, error: 'Invalid caller', state: next };
  }

  const last = next.lastPlay;
  const honest = last.actualCards.every((c) => c.rank === last.claimedRank);
  const liarId = last.playerId;
  const pileCards = [...next.pile];
  const revealedCards = [...last.actualCards];

  let takerId: string;
  if (honest) {
    takerId = callerId;
  } else {
    takerId = liarId;
  }

  const taker = next.players.find((p) => p.id === takerId)!;
  taker.hand = sortHandByRank([...taker.hand, ...pileCards]);
  next.pile = [];
  next.lastPlay = null;
  next.requiredRank = null;

  pushEvent(next, 'bluff_call', {
    callerId,
    liarId,
    honest,
    takerId,
    pileCount: pileCards.length,
    claimedRank: last.claimedRank,
    revealedCards: revealedCards.map((c) => ({
      id: c.id,
      suit: c.suit,
      rank: c.rank,
    })),
  });

  // Taker leads next (free claim)
  next.currentTurnPlayerId = takerId;
  // If taker already finished somehow, skip
  if (taker.hand.length === 0) {
    checkFinishes(next, takerId);
    const nxt = nextActive(next, takerId);
    next.currentTurnPlayerId = nxt?.id ?? null;
  }

  return { success: true, state: next };
}

/**
 * Pass your turn without throwing or calling.
 * Only when a claim is already on the table (pile active). Lead must throw.
 */
export function passBluffTurn(
  state: BluffState,
  playerId: string
): BluffActionResult {
  const next = clone(state);
  if (next.phase !== 'playing') {
    return { success: false, error: 'Cannot pass now', state: next };
  }
  if (next.currentTurnPlayerId !== playerId) {
    return { success: false, error: 'Not your turn', state: next };
  }
  if (!next.lastPlay) {
    return {
      success: false,
      error: 'Lead must throw — cannot pass',
      state: next,
    };
  }
  const player = next.players.find((p) => p.id === playerId);
  if (!player || player.finishOrder != null) {
    return { success: false, error: 'Invalid player', state: next };
  }

  const nxt = nextActive(next, playerId);
  if (!nxt || nxt.id === playerId) {
    return { success: false, error: 'No one to pass to', state: next };
  }

  next.currentTurnPlayerId = nxt.id;
  pushEvent(next, 'bluff_pass', { playerId, nextId: nxt.id });
  return { success: true, state: next };
}

/** Ranks you may claim on this turn. */
export function getClaimableRanks(state: BluffState): Rank[] {
  if (state.requiredRank) return [state.requiredRank];
  return [...RANKS];
}

/** Hide other players' true cards for network / UI views. */
export function sanitizeBluffState(
  state: BluffState,
  viewerId: string
): BluffState {
  const next = clone(state);
  next.players = next.players.map((p) => {
    if (p.id === viewerId) return p;
    return {
      ...p,
      hand: p.hand.map((_, i) => ({
        id: `hidden-${p.id}-${i}`,
        suit: 'spades' as const,
        rank: 'A' as Rank,
      })),
    };
  });
  if (next.lastPlay) {
    next.lastPlay = {
      ...next.lastPlay,
      actualCards: next.lastPlay.actualCards.map((_, i) => ({
        id: `pile-hidden-${i}`,
        suit: 'spades' as const,
        rank: next.lastPlay!.claimedRank,
      })),
    };
  }
  return next;
}

export { activePlayers, nextActive };
