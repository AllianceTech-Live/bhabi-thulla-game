import type { GameState, Player } from './types';
import type { SeatOrigin } from '../components/game/TrickPlayCard';

export type CollectTarget = SeatOrigin | 'deck' | 'hand';

function seatForRelative(
  players: GameState['players'],
  localSeat: number,
  offset: number
): Player | undefined {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const localIndex = ordered.findIndex((p: Player) => p.seat === localSeat);
  if (localIndex < 0) return ordered[0];
  return ordered[(localIndex + offset) % ordered.length];
}

/**
 * Map a player id to table seat relative to the local player.
 * Must match {@link GameTable} seat layout (2p opponent is top, not left).
 */
export function getSeatOriginForPlayer(
  state: GameState,
  localPlayerId: string | null,
  playerId: string
): SeatOrigin {
  const local =
    state.players.find((p: Player) => p.id === localPlayerId) ??
    state.players.find((p: Player) => p.type === 'human') ??
    state.players[0];
  if (!local) return 'bottom';

  const bottom = local;
  if (bottom.id === playerId) return 'bottom';

  const others = state.players.filter((p) => p.id !== local.id);
  if (others.length === 1) {
    return others[0]!.id === playerId ? 'top' : 'bottom';
  }

  const left = seatForRelative(state.players, local.seat, 1);
  const top = seatForRelative(state.players, local.seat, 2);
  const right = seatForRelative(state.players, local.seat, 3);

  if (top?.id === playerId) return 'top';
  if (left?.id === playerId) return 'left';
  if (right?.id === playerId) return 'right';
  return 'bottom';
}

/** Thulla pile flies to the collector's hand (you) or their seat on screen. */
export function getThullaCollectTarget(
  state: GameState,
  localPlayerId: string | null,
  collectorId: string
): CollectTarget {
  if (localPlayerId && collectorId === localPlayerId) {
    return 'hand';
  }
  return getSeatOriginForPlayer(state, localPlayerId, collectorId);
}
