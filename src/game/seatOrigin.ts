import type { GameState, Player } from './types';
import type { SeatOrigin } from '../components/game/TrickPlayCard';

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

/** Map a player id to table seat relative to the local player. */
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
  const left = seatForRelative(state.players, local.seat, 1);
  const top = seatForRelative(state.players, local.seat, 2);
  const right = seatForRelative(state.players, local.seat, 3);

  if (bottom.id === playerId) return 'bottom';
  if (top?.id === playerId) return 'top';
  if (left?.id === playerId) return 'left';
  if (right?.id === playerId) return 'right';
  return 'bottom';
}
