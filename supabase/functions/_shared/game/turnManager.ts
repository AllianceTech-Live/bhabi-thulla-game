import { Player, PlayerStatus } from './types.ts';

/** Players who have escaped are removed from turn rotation. */
export function getActivePlayers(players: Player[]): Player[] {
  return players
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.seat - b.seat);
}

export function getTurnOrder(players: Player[]): string[] {
  return getActivePlayers(players).map((p) => p.id);
}

/**
 * Clockwise next active player after `currentPlayerId`.
 * Clockwise = increasing seat number, wrapping around.
 */
export function getNextActivePlayer(
  players: Player[],
  currentPlayerId: string
): string | null {
  const active = getActivePlayers(players);
  if (active.length === 0) return null;

  const current = players.find((p) => p.id === currentPlayerId);
  if (!current) {
    return active[0]?.id ?? null;
  }

  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const startIndex = sorted.findIndex((p) => p.id === currentPlayerId);

  for (let offset = 1; offset <= sorted.length; offset++) {
    const candidate = sorted[(startIndex + offset) % sorted.length]!;
    if (candidate.status === 'active') {
      return candidate.id;
    }
  }

  return null;
}

export function getPreviousActivePlayer(
  players: Player[],
  currentPlayerId: string
): string | null {
  const active = getActivePlayers(players);
  if (active.length === 0) return null;

  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const startIndex = sorted.findIndex((p) => p.id === currentPlayerId);
  if (startIndex < 0) return active[active.length - 1]?.id ?? null;

  for (let offset = 1; offset <= sorted.length; offset++) {
    const idx = (startIndex - offset + sorted.length) % sorted.length;
    const candidate = sorted[idx]!;
    if (candidate.status === 'active') {
      return candidate.id;
    }
  }

  return null;
}

export function isPlayerActive(
  players: Player[],
  playerId: string
): boolean {
  const player = players.find((p) => p.id === playerId);
  return player?.status === 'active';
}

export function countActivePlayers(players: Player[]): number {
  return players.filter((p) => p.status === 'active').length;
}

export function markEscaped(
  players: Player[],
  playerId: string
): Player[] {
  return players.map((p) =>
    p.id === playerId
      ? { ...p, status: 'escaped' as PlayerStatus, hand: [] }
      : p
  );
}

export function markBhabhi(
  players: Player[],
  playerId: string
): Player[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, status: 'bhabhi' as PlayerStatus } : p
  );
}
