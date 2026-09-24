import type { GameState, Player } from '@/src/game/types';
import type { LobbyPlayer } from '@/src/services/online';

/** Build a full 4-seat table preview so empty seats show as Waiting. */
export function buildLobbyTableState(
  gameId: string,
  lobbyPlayers: LobbyPlayer[],
  localUserId: string | null
): GameState {
  const bySeat = new Map(lobbyPlayers.map((p) => [p.seat_number, p]));
  const players: Player[] = [];

  for (let seat = 1; seat <= 4; seat++) {
    const p = bySeat.get(seat);
    if (p) {
      players.push({
        id: p.player_id,
        name: p.display_name,
        seat,
        type: 'human',
        status: 'active',
        hand: [],
      });
    } else {
      players.push({
        id: `__waiting_${seat}`,
        name: 'Waiting',
        seat,
        type: 'human',
        status: 'active',
        hand: [],
      });
    }
  }

  // Prefer local user as “bottom” seat for GameTable relative layout.
  if (localUserId && !players.some((p) => p.id === localUserId)) {
    const open = players.find((p) => p.id.startsWith('__waiting_'));
    if (open) {
      open.id = localUserId;
      open.name = 'You';
    }
  }

  return {
    id: gameId,
    mode: 'online',
    phase: 'waiting',
    players,
    currentTurnPlayerId: null,
    trick: { leadSuit: null, plays: [], leaderId: null },
    discarded: [],
    events: [],
    escapedOrder: [],
    bhabhiId: null,
    roundNumber: 1,
    handRevealed: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
