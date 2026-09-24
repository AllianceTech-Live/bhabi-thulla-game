import { compareRanks } from '../deck';
import { getPlayableCards } from '../rules/playable';
import { AiDifficulty, Card, GameState, Suit } from '../types';

export interface AiContext {
  state: GameState;
  playerId: string;
  difficulty: AiDifficulty;
}

/**
 * Deterministic rule-based AI. Obeys all game rules.
 * No external AI API.
 */
export function chooseCard(ctx: AiContext): Card {
  const player = ctx.state.players.find((p) => p.id === ctx.playerId);
  if (!player) {
    throw new Error('AI player not found');
  }

  const leadSuit = ctx.state.trick.leadSuit;
  const playable = getPlayableCards(player.hand, leadSuit);

  if (playable.length === 0) {
    throw new Error('AI has no playable cards');
  }

  // Opening move: must play Ace of Spades if present and opening
  const aceSpades = playable.find((c) => c.id === 'spades-A');
  if (
    aceSpades &&
    leadSuit === null &&
    ctx.state.discarded.length === 0 &&
    ctx.state.trick.plays.length === 0
  ) {
    const totalCards = ctx.state.players.reduce(
      (s, p) => s + p.hand.length,
      0
    );
    if (totalCards === 52) return aceSpades;
  }

  switch (ctx.difficulty) {
    case 'easy':
      return chooseEasy(playable);
    case 'medium':
      return chooseMedium(playable, leadSuit, ctx);
    case 'hard':
      return chooseHard(playable, leadSuit, ctx);
    default:
      return chooseEasy(playable);
  }
}

function chooseEasy(playable: Card[]): Card {
  // Random among legal; deterministic tie-break by id for stability in tests
  const index = Math.floor(Math.random() * playable.length);
  return playable[index]!;
}

function chooseMedium(
  playable: Card[],
  leadSuit: Suit | null,
  ctx: AiContext
): Card {
  const played = getPlayedCards(ctx.state);

  if (leadSuit === null) {
    // Lead something mid-low to avoid burning aces early
    const sorted = [...playable].sort(
      (a, b) => compareRanks(a.rank, b.rank)
    );
    const mid = sorted[Math.floor(sorted.length / 3)] ?? sorted[0]!;
    return mid;
  }

  const following = playable.filter((c) => c.suit === leadSuit);
  if (following.length > 0) {
    // Play lowest that still might matter, else dump lowest
    const sorted = [...following].sort(
      (a, b) => compareRanks(a.rank, b.rank)
    );
    return sorted[0]!;
  }

  // Forced Thulla — dump highest off-suit risk card
  return dumpHighestRisk(playable, played);
}

function chooseHard(
  playable: Card[],
  leadSuit: Suit | null,
  ctx: AiContext
): Card {
  const played = getPlayedCards(ctx.state);
  const myHand = ctx.state.players.find((p) => p.id === ctx.playerId)!.hand;

  if (leadSuit === null) {
    // Prefer leading a suit where we have length, mid-rank
    const bySuit = groupBySuit(playable);
    let best: Card | null = null;
    let bestScore = -Infinity;

    for (const cards of Object.values(bySuit)) {
      if (!cards || cards.length === 0) continue;
      const sorted = [...cards].sort((a, b) =>
        compareRanks(a.rank, b.rank)
      );
      const candidate =
        sorted[Math.floor(sorted.length / 2)] ?? sorted[0]!;
      const lengthBonus = cards.length * 2;
      const rankPenalty = compareRanks(candidate.rank, '2');
      const score = lengthBonus - rankPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best ?? playable[0]!;
  }

  const following = playable.filter((c) => c.suit === leadSuit);
  if (following.length > 0) {
    const currentHigh = getCurrentTrickHigh(ctx.state, leadSuit);
    const sorted = [...following].sort(
      (a, b) => compareRanks(a.rank, b.rank)
    );

    if (currentHigh) {
      // Try to duck under current high if others yet to play; else win cheaply
      const under = sorted.filter(
        (c) => compareRanks(c.rank, currentHigh.rank) < 0
      );
      if (under.length > 0) return under[under.length - 1]!;
    }

    // Play lowest
    return sorted[0]!;
  }

  // Forced Thulla — dump singleton high or riskiest card
  const offSuit = playable.filter((c) => c.suit !== leadSuit);
  return dumpHighestRisk(offSuit.length ? offSuit : playable, played, myHand);
}

function getPlayedCards(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const c of state.discarded) ids.add(c.id);
  for (const p of state.trick.plays) ids.add(p.card.id);
  return ids;
}

function getCurrentTrickHigh(
  state: GameState,
  leadSuit: Suit
): Card | null {
  const leadPlays = state.trick.plays.filter(
    (p) => p.card.suit === leadSuit
  );
  if (leadPlays.length === 0) return null;
  return leadPlays.reduce((best, p) =>
    compareRanks(p.card.rank, best.rank) > 0 ? p.card : best
  , leadPlays[0]!.card);
}

function groupBySuit(cards: Card[]): Partial<Record<Suit, Card[]>> {
  const map: Partial<Record<Suit, Card[]>> = {};
  for (const c of cards) {
    if (!map[c.suit]) map[c.suit] = [];
    map[c.suit]!.push(c);
  }
  return map;
}

function dumpHighestRisk(
  cards: Card[],
  _played: Set<string>,
  hand?: Card[]
): Card {
  // Prefer dumping A/K of short suits
  const sorted = [...cards].sort((a, b) => {
    const rankDiff = compareRanks(b.rank, a.rank);
    if (rankDiff !== 0) return rankDiff;
    if (hand) {
      const aLen = hand.filter((c) => c.suit === a.suit).length;
      const bLen = hand.filter((c) => c.suit === b.suit).length;
      return aLen - bLen; // shorter suits first
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0]!;
}

/** Deterministic easy AI for tests (no Math.random). */
export function chooseCardDeterministic(
  ctx: AiContext,
  preferLowest = true
): Card {
  const player = ctx.state.players.find((p) => p.id === ctx.playerId);
  if (!player) throw new Error('AI player not found');

  const playable = getPlayableCards(player.hand, ctx.state.trick.leadSuit);
  const aceSpades = playable.find((c) => c.id === 'spades-A');
  if (
    aceSpades &&
    ctx.state.trick.leadSuit === null &&
    ctx.state.discarded.length === 0 &&
    ctx.state.trick.plays.length === 0
  ) {
    const total = ctx.state.players.reduce((s, p) => s + p.hand.length, 0);
    if (total === 52) return aceSpades;
  }

  const sorted = [...playable].sort((a, b) =>
    preferLowest
      ? compareRanks(a.rank, b.rank) || a.id.localeCompare(b.id)
      : compareRanks(b.rank, a.rank) || a.id.localeCompare(b.id)
  );
  return sorted[0]!;
}
