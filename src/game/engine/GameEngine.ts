import { createDeck, dealCards, findPlayerWithAceOfSpades, isAceOfSpades, sortHand } from '../deck';
import { isLegalMove, wouldBeThulla } from '../rules/playable';
import {
  resolveNormalTrick,
  resolveThulla,
} from '../rules/thulla';
import { shuffleDeck } from '../shuffle';
import {
  countActivePlayers,
  getNextActivePlayer,
  markBhabhi,
  markEscaped,
} from '../turnManager';
import {
  AiDifficulty,
  Card,
  GameEvent,
  GameMode,
  GameState,
  Player,
  PlayerType,
  PlayCardResult,
  TrickState,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from '../types';

export interface CreateGameOptions {
  mode: GameMode;
  playerConfigs: Array<{
    id: string;
    name: string;
    type: PlayerType;
    aiDifficulty?: AiDifficulty;
  }>;
  /** Optional seeded shuffle for tests */
  randomFn?: () => number;
  gameId?: string;
}

function emptyTrick(): TrickState {
  return { leadSuit: null, plays: [], leaderId: null };
}

function now(): number {
  return Date.now();
}

function makeEvent(
  type: GameEvent['type'],
  payload?: Record<string, unknown>
): GameEvent {
  return { type, payload, timestamp: now() };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
    })),
    trick: {
      ...state.trick,
      plays: [...state.trick.plays],
    },
    discarded: [...state.discarded],
    events: [...state.events],
    escapedOrder: [...state.escapedOrder],
  };
}

/**
 * Create and deal a new game. Ace of Spades holder leads
 * and must play Ace of Spades first.
 */
export function createGame(options: CreateGameOptions): GameState {
  const { mode, playerConfigs, randomFn, gameId } = options;
  const count = playerConfigs.length;

  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new Error(`Players must be ${MIN_PLAYERS}–${MAX_PLAYERS}`);
  }

  const deck = shuffleDeck(createDeck(), randomFn);
  const hands = dealCards(deck, count);

  const players: Player[] = playerConfigs.map((cfg, index) => ({
    id: cfg.id,
    name: cfg.name,
    seat: index + 1,
    type: cfg.type,
    status: 'active',
    hand: hands[index]!,
    aiDifficulty: cfg.aiDifficulty,
  }));

  const starterId = findPlayerWithAceOfSpades(players);
  if (!starterId) {
    throw new Error('Ace of Spades not found after deal');
  }

  const timestamp = now();
  const dealEvent = makeEvent('deal', {
    playerCount: count,
    starterId,
  });

  return {
    id: gameId ?? `game-${timestamp}`,
    mode,
    phase: 'playing',
    players,
    currentTurnPlayerId: starterId,
    trick: { ...emptyTrick(), leaderId: starterId },
    discarded: [],
    events: [dealEvent],
    escapedOrder: [],
    bhabhiId: null,
    roundNumber: 1,
    handRevealed: mode !== 'offline_pass_play',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

function removeCardFromHand(hand: Card[], cardId: string): Card[] {
  return hand.filter((c) => c.id !== cardId);
}

function addCardsToHand(hand: Card[], cards: Card[]): Card[] {
  return sortHand([...hand, ...cards]);
}

/**
 * First move of the game must be Ace of Spades:
 * empty trick, nothing discarded, all 52 cards still in hands.
 */
function isOpeningMove(state: GameState): boolean {
  if (state.trick.plays.length > 0) return false;
  if (state.discarded.length > 0) return false;
  if (state.escapedOrder.length > 0) return false;
  const cardsInHands = state.players.reduce(
    (sum, p) => sum + p.hand.length,
    0
  );
  return cardsInHands === 52;
}

function mustPlayAceOfSpades(state: GameState, card: Card): boolean {
  if (!isOpeningMove(state)) return false;
  return !isAceOfSpades(card);
}

function playersWhoNeedToPlay(state: GameState): string[] {
  const activeIds = state.players
    .filter((p) => p.status === 'active')
    .map((p) => p.id);
  const alreadyPlayed = new Set(state.trick.plays.map((p) => p.playerId));
  return activeIds.filter((id) => !alreadyPlayed.has(id));
}

function checkEscapeAndBhabhi(
  state: GameState,
  events: GameEvent[]
): GameState {
  let next = state;

  // Mark newly emptied hands as escaped
  for (const player of next.players) {
    if (
      player.status === 'active' &&
      player.hand.length === 0
    ) {
      next = {
        ...next,
        players: markEscaped(next.players, player.id),
        escapedOrder: [...next.escapedOrder, player.id],
        phase: 'player_escaped',
      };
      events.push(
        makeEvent('player_escaped', {
          playerId: player.id,
          name: player.name,
        })
      );
    }
  }

  const activeCount = countActivePlayers(next.players);

  if (activeCount <= 1) {
    const remaining = next.players.find((p) => p.status === 'active');
    if (remaining) {
      next = {
        ...next,
        players: markBhabhi(next.players, remaining.id),
        bhabhiId: remaining.id,
        phase: 'game_complete',
        currentTurnPlayerId: null,
      };
      events.push(
        makeEvent('bhabhi', {
          playerId: remaining.id,
          name: remaining.name,
        })
      );
      events.push(makeEvent('game_complete', { bhabhiId: remaining.id }));
    } else {
      // Everyone escaped somehow — treat last escaped as bhabhi edge case
      const lastEscaped = next.escapedOrder[next.escapedOrder.length - 1];
      if (lastEscaped) {
        next = {
          ...next,
          players: markBhabhi(next.players, lastEscaped),
          bhabhiId: lastEscaped,
          phase: 'game_complete',
          currentTurnPlayerId: null,
        };
        events.push(
          makeEvent('bhabhi', { playerId: lastEscaped })
        );
        events.push(makeEvent('game_complete', { bhabhiId: lastEscaped }));
      }
    }
  }

  return next;
}

function finishTrickAfterThulla(
  state: GameState,
  events: GameEvent[]
): GameState {
  const leadSuit = state.trick.leadSuit;
  if (!leadSuit) {
    throw new Error('Thulla without lead suit');
  }

  const resolution = resolveThulla(state.trick.plays, leadSuit);
  events.push(
    makeEvent('thulla', {
      collectorId: resolution.collectorId,
      pileSize: resolution.pile.length,
    })
  );

  let players = state.players.map((p) => {
    if (p.id === resolution.collectorId) {
      return {
        ...p,
        hand: addCardsToHand(p.hand, resolution.pile),
      };
    }
    return p;
  });

  events.push(
    makeEvent('pile_collected', {
      playerId: resolution.collectorId,
      cards: resolution.pile.map((c) => c.id),
    })
  );

  let next: GameState = {
    ...state,
    players,
    phase: 'playing',
    trick: {
      leadSuit: null,
      plays: [],
      leaderId: resolution.collectorId,
    },
    currentTurnPlayerId: resolution.collectorId,
    updatedAt: now(),
  };

  // Collector just received cards — they cannot have escaped from empty hand
  // But other players who emptied may escape
  next = checkEscapeAndBhabhi(next, events);

  // If collector is still active, they lead; if they somehow escaped, next active
  if (
    next.phase !== 'game_complete' &&
    next.currentTurnPlayerId
  ) {
    const leader = getPlayer(next, next.currentTurnPlayerId);
    if (!leader || leader.status !== 'active') {
      const nextId = getNextActivePlayer(
        next.players,
        next.currentTurnPlayerId
      );
      next = {
        ...next,
        currentTurnPlayerId: nextId,
        trick: { ...next.trick, leaderId: nextId },
      };
    }
  }

  if (next.phase === 'player_escaped') {
    next = { ...next, phase: 'playing' };
  }

  return next;
}

function finishNormalTrick(
  state: GameState,
  events: GameEvent[]
): GameState {
  const leadSuit = state.trick.leadSuit;
  if (!leadSuit) {
    throw new Error('Normal trick without lead suit');
  }

  const { winnerId, cards } = resolveNormalTrick(state.trick.plays, leadSuit);

  events.push(
    makeEvent('trick_won', {
      winnerId,
      cards: cards.map((c) => c.id),
    })
  );

  let next: GameState = {
    ...state,
    discarded: [...state.discarded, ...cards],
    trick: {
      leadSuit: null,
      plays: [],
      leaderId: winnerId,
    },
    currentTurnPlayerId: winnerId,
    phase: 'playing',
    updatedAt: now(),
  };

  next = checkEscapeAndBhabhi(next, events);

  if (next.phase !== 'game_complete') {
    const winner = getPlayer(next, winnerId);
    if (!winner || winner.status !== 'active') {
      const nextId = getNextActivePlayer(next.players, winnerId);
      next = {
        ...next,
        currentTurnPlayerId: nextId,
        trick: { ...next.trick, leaderId: nextId },
      };
    }
    if (next.phase === 'player_escaped') {
      next = { ...next, phase: 'playing' };
    }
  }

  return next;
}

/**
 * Play a card — pure, deterministic game engine.
 * Same logic used by offline, AI, and online (server) modes.
 */
export function playCard(
  state: GameState,
  playerId: string,
  cardId: string
): PlayCardResult {
  const events: GameEvent[] = [];
  let next = cloneState(state);

  if (next.phase === 'game_complete') {
    return { success: false, error: 'Game is already complete', state: next, events };
  }

  if (
    next.phase !== 'playing' &&
    next.phase !== 'player_escaped' &&
    next.phase !== 'thulla'
  ) {
    return {
      success: false,
      error: `Cannot play during phase: ${next.phase}`,
      state: next,
      events,
    };
  }

  if (next.currentTurnPlayerId !== playerId) {
    return {
      success: false,
      error: 'Not your turn',
      state: next,
      events,
    };
  }

  const player = getPlayer(next, playerId);
  if (!player || player.status !== 'active') {
    return {
      success: false,
      error: 'Player is not active',
      state: next,
      events,
    };
  }

  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    return {
      success: false,
      error: 'Card not in hand',
      state: next,
      events,
    };
  }

  if (mustPlayAceOfSpades(next, card)) {
    return {
      success: false,
      error: 'First move must be Ace of Spades',
      state: next,
      events,
    };
  }

  if (!isLegalMove(card, player.hand, next.trick.leadSuit)) {
    return {
      success: false,
      error: 'Illegal move: must follow suit',
      state: next,
      events,
    };
  }

  const previousLeadSuit = next.trick.leadSuit;
  const isThulla =
    previousLeadSuit !== null &&
    wouldBeThulla(card, player.hand, previousLeadSuit);

  // Remove card from hand
  next = {
    ...next,
    players: next.players.map((p) =>
      p.id === playerId
        ? { ...p, hand: removeCardFromHand(p.hand, cardId) }
        : p
    ),
    handRevealed: next.mode !== 'offline_pass_play',
  };

  const leadSuit = previousLeadSuit ?? card.suit;

  const play = {
    playerId,
    card,
    isThulla,
  };

  next = {
    ...next,
    trick: {
      leadSuit,
      plays: [...next.trick.plays, play],
      leaderId: next.trick.leaderId ?? playerId,
    },
    updatedAt: now(),
  };

  events.push(
    makeEvent('card_played', {
      playerId,
      cardId: card.id,
      isThulla,
    })
  );

  // Thulla ends the trick immediately — remaining players do not play
  if (isThulla) {
    next = { ...next, phase: 'thulla' };
    next = finishTrickAfterThulla(next, events);
    if (next.mode === 'offline_pass_play' && next.phase !== 'game_complete') {
      next = { ...next, handRevealed: false };
      events.push(
        makeEvent('pass_device', {
          nextPlayerId: next.currentTurnPlayerId,
        })
      );
    }
    return { success: true, state: next, events };
  }

  // Check if all active players have played
  const remaining = playersWhoNeedToPlay(next);
  if (remaining.length === 0) {
    next = finishNormalTrick(next, events);
  } else {
    const nextPlayerId = getNextActivePlayer(next.players, playerId);
    next = {
      ...next,
      currentTurnPlayerId: nextPlayerId,
      phase: 'playing',
    };

    // Escape check for the player who just emptied their hand mid-trick
    // (they still "played"; escape after trick resolves is safer,
    // but if hand is empty and trick continues they should leave rotation)
    if (player.hand.length === 1) {
      // hand already had card removed — check empty
      const updatedPlayer = getPlayer(next, playerId);
      if (updatedPlayer && updatedPlayer.hand.length === 0) {
        // They escape but trick continues without them for future tricks.
        // For current trick they already played. Mark escaped after trick.
        // Spec: when 0 cards they escape and no longer participate in future tricks.
        // Current trick already has their play.
      }
    }
  }

  // After any play, if someone's hand is empty, mark escaped
  // (but keep them in current trick if they already played)
  const emptied = getPlayer(next, playerId);
  if (
    emptied &&
    emptied.hand.length === 0 &&
    emptied.status === 'active' &&
    remaining.length > 0
  ) {
    // Escape immediately for future tricks; current trick already recorded
    next = {
      ...next,
      players: markEscaped(next.players, playerId),
      escapedOrder: [...next.escapedOrder, playerId],
    };
    events.push(
      makeEvent('player_escaped', { playerId, name: emptied.name })
    );

    // Recompute next player skipping escaped
    if (next.currentTurnPlayerId === playerId || !getPlayer(next, next.currentTurnPlayerId!)?.status) {
      const nextId = getNextActivePlayer(next.players, playerId);
      next = { ...next, currentTurnPlayerId: nextId };
    }

    // Check bhabhi
    if (countActivePlayers(next.players) <= 1) {
      next = checkEscapeAndBhabhi(
        {
          ...next,
          // re-mark — already escaped
        },
        events
      );
    }
  }

  if (next.mode === 'offline_pass_play' && next.phase !== 'game_complete') {
    next = { ...next, handRevealed: false };
    events.push(
      makeEvent('pass_device', { nextPlayerId: next.currentTurnPlayerId })
    );
  }

  return { success: true, state: next, events };
}

/** Reveal hand in pass-and-play mode. */
export function revealHand(state: GameState): GameState {
  return { ...state, handRevealed: true, updatedAt: now() };
}

/** Public view of another player's hand size (never expose cards). */
export function getPublicPlayerView(player: Player): {
  id: string;
  name: string;
  seat: number;
  status: Player['status'];
  cardsRemaining: number;
  type: PlayerType;
} {
  return {
    id: player.id,
    name: player.name,
    seat: player.seat,
    status: player.status,
    cardsRemaining: player.hand.length,
    type: player.type,
  };
}
