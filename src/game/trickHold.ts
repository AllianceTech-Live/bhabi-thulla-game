import type { Card, GameEvent, GameState, Rank, Suit, TrickPlay } from './types';
import { RANKS, SUITS } from './types';
import type { ThullaMoment } from '../store/gameStore';

function cardFromId(id: string): Card | null {
  const i = id.indexOf('-');
  if (i < 0) return null;
  const suit = id.slice(0, i) as Suit;
  const rank = id.slice(i + 1) as Rank;
  if (!SUITS.includes(suit) || !RANKS.includes(rank as Rank)) return null;
  return { id, suit, rank };
}

export function trickPlaysSignature(plays: TrickPlay[] | null | undefined): string {
  if (!plays || plays.length === 0) return '';
  return plays.map((p) => `${p.playerId}:${p.card.id}`).join('|');
}

/**
 * Cards to show in the table center.
 * Prefer a longer client hold (optimistic throw) so the card does not
 * unmount/remount when the server state catches up (that replayed the throw).
 */
export function tableVisiblePlays(
  state: GameState,
  heldTrickPlays: TrickPlay[] | null
): TrickPlay[] {
  const live = state.trick.plays;
  const held = heldTrickPlays;
  if (held && held.length > 0) {
    // Prefer the longer client hold so optimistic throws are not replaced by a
    // shorter stale poll (that remounted the card and replayed the throw).
    if (held.length >= live.length) return held;
  }
  if (live.length > 0) return live;
  return [];
}

/** Prefer the longer in-flight hold so stale online polls do not shrink the pile. */
export function mergeHeldTrickPlays(
  current: TrickPlay[] | null,
  incoming: TrickPlay[] | null | undefined
): TrickPlay[] | null {
  if (!incoming || incoming.length === 0) {
    return current && current.length > 0 ? current : null;
  }
  if (current && current.length > 0) {
    if (
      current.length > incoming.length &&
      playsContainAll(current, incoming)
    ) {
      return current;
    }
    if (trickPlaysSignature(current) === trickPlaysSignature(incoming)) {
      const thullaByKey = new Map<string, boolean>(
        incoming.map((p) => [`${p.playerId}:${p.card.id}`, p.isThulla])
      );
      let changed = false;
      const merged = current.map((p) => {
        const key = `${p.playerId}:${p.card.id}`;
        const flag = thullaByKey.get(key);
        if (flag != null && p.isThulla !== flag) {
          changed = true;
          return { ...p, isThulla: flag };
        }
        return p;
      });
      return changed ? merged : current;
    }
  }
  return incoming;
}

/** True when `longer` contains every play in `shorter` (by player+card). */
export function playsContainAll(
  longer: TrickPlay[] | null | undefined,
  shorter: TrickPlay[] | null | undefined
): boolean {
  if (!shorter || shorter.length === 0) return true;
  if (!longer || longer.length < shorter.length) return false;
  const keys = new Set(longer.map((p) => `${p.playerId}:${p.card.id}`));
  return shorter.every((p) => keys.has(`${p.playerId}:${p.card.id}`));
}

/**
 * Reconstruct a just-completed pile (for a one-shot UI hold).
 * Prefer server `lastResolvedPlays`; fall back to prev + events.
 */
export function rebuildCompletedTrick(
  prev: GameState | null,
  next: GameState
): TrickPlay[] | null {
  if (next.trick.plays.length > 0) return null;
  if (next.lastResolvedPlays && next.lastResolvedPlays.length > 0) {
    return next.lastResolvedPlays;
  }
  if (!prev || prev.trick.plays.length === 0) {
    return rebuildFromEvents(next.events, prev?.events.length ?? 0);
  }

  const prevEventCount = prev.events.length;
  const fresh = next.events.slice(prevEventCount);
  const completed: TrickPlay[] = [...prev.trick.plays];
  const seen = new Set(completed.map((p) => `${p.playerId}:${p.card.id}`));

  for (const ev of fresh) {
    if (ev.type !== 'card_played') continue;
    const playerId = String(ev.payload?.playerId ?? '');
    const cardId = String(ev.payload?.cardId ?? '');
    const card = cardFromId(cardId);
    if (!playerId || !card) continue;
    const key = `${playerId}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    completed.push({
      playerId,
      card,
      isThulla: Boolean(ev.payload?.isThulla),
    });
  }

  if (completed.length > prev.trick.plays.length) return completed;
  return rebuildFromEvents(next.events, prevEventCount) ?? completed;
}

function rebuildFromEvents(
  events: GameEvent[],
  fromIndex: number
): TrickPlay[] | null {
  let endIdx = -1;
  for (let i = events.length - 1; i >= fromIndex; i--) {
    const t = events[i]?.type;
    if (t === 'trick_won' || t === 'thulla' || t === 'pile_collected') {
      endIdx = i;
      break;
    }
  }
  if (endIdx < 0) return null;

  const plays: TrickPlay[] = [];
  const seen = new Set<string>();
  for (let i = endIdx - 1; i >= 0; i--) {
    const e = events[i]!;
    if (
      e.type === 'trick_won' ||
      e.type === 'thulla' ||
      e.type === 'pile_collected' ||
      e.type === 'deal'
    ) {
      break;
    }
    if (e.type !== 'card_played') continue;
    const playerId = String(e.payload?.playerId ?? '');
    const cardId = String(e.payload?.cardId ?? '');
    const card = cardFromId(cardId);
    if (!playerId || !card) continue;
    const key = `${playerId}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plays.unshift({
      playerId,
      card,
      isThulla: Boolean(e.payload?.isThulla),
    });
  }
  return plays.length > 0 ? plays : null;
}

export function buildThullaMomentFromStates(
  prev: GameState | null,
  next: GameState,
  completed: TrickPlay[]
): ThullaMoment | null {
  const prevEventCount = prev?.events.length ?? 0;
  const fresh = next.events.slice(prevEventCount);
  let thullaEvent = [...fresh].reverse().find((e) => e.type === 'thulla');
  // Poll may skip the exact transition — still show Thulla for everyone.
  if (!thullaEvent && completed.some((p) => p.isThulla)) {
    thullaEvent = [...next.events].reverse().find((e) => e.type === 'thulla');
  }
  if (!thullaEvent) return null;

  let thullaPlay = [...completed].reverse().find((p) => p.isThulla);
  if (!thullaPlay) {
    const cardId = String(thullaEvent.payload?.cardId ?? '');
    const playerId = String(thullaEvent.payload?.playerId ?? '');
    thullaPlay = completed.find(
      (p) => p.playerId === playerId && p.card.id === cardId
    );
    if (thullaPlay) {
      thullaPlay = { ...thullaPlay, isThulla: true };
    }
  }
  const leadSuit =
    prev?.trick.leadSuit ??
    completed.find((p) => !p.isThulla)?.card.suit ??
    null;
  if (!thullaPlay || !leadSuit) return null;

  const collectorId = String(thullaEvent.payload?.collectorId ?? '');
  const collector = next.players.find((p) => p.id === collectorId);
  const thullaPlayer = next.players.find((p) => p.id === thullaPlay.playerId);

  return {
    plays: completed.map((p) =>
      p.playerId === thullaPlay!.playerId && p.card.id === thullaPlay!.card.id
        ? { ...p, isThulla: true }
        : p
    ),
    leadSuit,
    thullaPlayerId: thullaPlay.playerId,
    thullaPlayerName: thullaPlayer?.name ?? 'Player',
    collectorId,
    collectorName: collector?.name ?? 'Player',
    thullaCard: thullaPlay.card,
  };
}

function hasFreshThullaEvent(prev: GameState | null, next: GameState): boolean {
  if (!prev) return false;
  const prevEventCount = prev.events.length;
  if (prevEventCount >= next.events.length) return false;
  return next.events.slice(prevEventCount).some((e) => e.type === 'thulla');
}

function trickJustResolved(prev: GameState | null, next: GameState): boolean {
  if (next.trick.plays.length > 0) return false;
  if (prev && prev.trick.plays.length > 0) return true;
  const prevSig = trickPlaysSignature(prev?.lastResolvedPlays);
  const nextSig = trickPlaysSignature(next.lastResolvedPlays);
  return Boolean(nextSig) && nextSig !== prevSig;
}

/**
 * Start a brief input-locking hold only when a trick *just* resolved.
 * Do not revive the hold on every poll while `lastResolvedPlays` remains —
 * that was resetting the clear timer forever and freezing the table.
 */
export function nextHeldTrickPlays(
  prev: GameState | null,
  next: GameState,
  previousHeld: TrickPlay[] | null
): { held: TrickPlay[] | null; thulla: ThullaMoment | null; revive: boolean } {
  if (next.trick.plays.length > 0) {
    return { held: next.trick.plays, thulla: null, revive: false };
  }

  const justResolved = trickJustResolved(prev, next);
  const freshThulla = hasFreshThullaEvent(prev, next);

  if (justResolved || freshThulla) {
    const completed = rebuildCompletedTrick(prev, next);
    if (completed && completed.length > 0) {
      const thulla = buildThullaMomentFromStates(prev, next, completed);
      return { held: completed, thulla, revive: true };
    }
  }

  // Keep an in-progress hold until the UI timer clears it — but do not
  // treat this as a new resolve (caller must not reset the timer).
  if (previousHeld && previousHeld.length > 0) {
    return { held: previousHeld, thulla: null, revive: false };
  }

  return { held: null, thulla: null, revive: false };
}
