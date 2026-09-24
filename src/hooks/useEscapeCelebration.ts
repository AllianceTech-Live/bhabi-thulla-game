import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import { triggerHaptic } from '../services/haptics';

/**
 * Watches existing player_escaped events for the people on this phone.
 * Does not change rules. holdResults stays true until the celebration closes
 * so the results screen does not cut it off.
 */
export function useEscapeCelebration(
  state: GameState | null | undefined,
  playerIds: string[],
  paused = false
) {
  const idsKey = playerIds.filter(Boolean).join(',');
  const seen = useRef<number | null>(null);
  const pending = useRef<string | null>(null);
  const prevHands = useRef<Record<string, number>>({});
  const holdResults = useRef(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) return;
    if (seen.current == null) {
      seen.current = state.events.length;
      for (const id of ids) {
        const player = state.players.find((p) => p.id === id);
        if (player) prevHands.current[id] = player.hand.length;
      }
      return;
    }
    const fresh = state.events.slice(seen.current);
    seen.current = state.events.length;
    for (const id of ids) {
      const player = state.players.find((p) => p.id === id);
      if (!player) continue;
      const prev = prevHands.current[id];
      if (prev != null && prev > 0 && player.hand.length === 0) {
        pending.current = player.name || 'You';
      }
      prevHands.current[id] = player.hand.length;
    }
    const hit = [...fresh]
      .reverse()
      .find(
        (event) =>
          event.type === 'player_escaped' &&
          ids.includes(String(event.payload?.playerId ?? ''))
      );
    if (hit) {
      const fromEvent = hit.payload?.name;
      pending.current = typeof fromEvent === 'string' ? fromEvent : 'You';
    }
    if (pending.current && !paused && name == null) {
      holdResults.current = true;
      setName(pending.current);
      pending.current = null;
      void triggerHaptic('success');
    }
  }, [state, idsKey, paused, name]);

  const dismiss = useCallback(() => {
    holdResults.current = false;
    setName(null);
  }, []);

  return { name, dismiss, holdResults };
}
