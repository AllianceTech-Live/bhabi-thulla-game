import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { GAME_TIMING } from '../constants/timing';
import { playSfx } from '../services/audio';

/** Ignore turn-chime after a throw — turn often updates on the next React tick. */
const PASS_TURN_SUPPRESS_MS = 900;

/**
 * Plays table sounds from game events. Does not change rules.
 * Skips the events already on screen when the listener starts.
 */
export function useGameSfx(
  state: GameState | null | undefined,
  visibleCount: number,
  paused = false
) {
  const eventsSeen = useRef<number | null>(null);
  const turnSeen = useRef<string | null | undefined>(undefined);
  const visibleSeen = useRef<number | null>(null);
  const landTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const suppressPassUntil = useRef(0);

  useEffect(() => {
    return () => {
      landTimers.current.forEach(clearTimeout);
      landTimers.current = [];
    };
  }, []);

  useEffect(() => {
    if (!state) return;

    if (paused) {
      eventsSeen.current = state.events.length;
      turnSeen.current = state.currentTurnPlayerId;
      visibleSeen.current = visibleCount;
      return;
    }

    if (eventsSeen.current == null || turnSeen.current === undefined) {
      eventsSeen.current = state.events.length;
      turnSeen.current = state.currentTurnPlayerId;
      visibleSeen.current = visibleCount;
      return;
    }

    const fresh = state.events.slice(eventsSeen.current);
    eventsSeen.current = state.events.length;
    let threwCard = false;

    for (let i = 0; i < fresh.length; i++) {
      const event = fresh[i];
      if (event.type === 'card_played') {
        threwCard = true;
        suppressPassUntil.current = Date.now() + PASS_TURN_SUPPRESS_MS;
        void playSfx('card_throw');
        // Thulla cards slap the table in their own slam animation.
        if (fresh[i + 1]?.type === 'thulla') continue;
        const t = setTimeout(() => {
          void playSfx('card_play');
        }, GAME_TIMING.cardPlayAnimMs);
        landTimers.current.push(t);
      } else if (event.type === 'thulla') {
        // Thulla sting is timed to the slam animation.
      } else if (event.type === 'player_escaped') {
        void playSfx('stage');
      } else if (event.type === 'bhabhi') {
        void playSfx('error');
      }
      // game_complete: win/lose sting is played by the game screen.
    }

    const turnChanged =
      Boolean(state.currentTurnPlayerId) &&
      state.currentTurnPlayerId !== turnSeen.current;
    const passAllowed = Date.now() >= suppressPassUntil.current;

    if (turnChanged && !threwCard && passAllowed) {
      void playSfx('pass_turn');
    }
    turnSeen.current = state.currentTurnPlayerId;

    if (
      visibleSeen.current != null &&
      visibleSeen.current > 0 &&
      visibleCount === 0
    ) {
      void playSfx('untap');
    }
    visibleSeen.current = visibleCount;
  }, [state, visibleCount, paused]);
}
