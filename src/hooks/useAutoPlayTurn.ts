import { useEffect, useRef } from 'react';
import { GAME_TIMING } from '../constants/timing';

type Args = {
  /** Persistent Auto mode (timeout or user toggled). */
  autoPlay: boolean;
  /** True when this client may legally act right now. */
  myTurnReady: boolean;
  /** Unique per turn / trick step — Auto plays at most once per key. */
  turnKey: string | null;
  /** Perform one auto move for the current turn. */
  playOnce: () => void;
};

/**
 * When Auto is on, play exactly once each time a new turnKey becomes ready.
 * Guards against state/poll churn re-firing the same turn forever.
 */
export function useAutoPlayTurn({
  autoPlay,
  myTurnReady,
  turnKey,
  playOnce,
}: Args): void {
  const playOnceRef = useRef(playOnce);
  playOnceRef.current = playOnce;
  const lastPlayedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!autoPlay) {
      lastPlayedKey.current = null;
      return;
    }
    if (!myTurnReady || !turnKey) return;
    if (lastPlayedKey.current === turnKey) return;

    lastPlayedKey.current = turnKey;
    const t = setTimeout(() => {
      playOnceRef.current();
    }, GAME_TIMING.autoPlayDelayMs);
    return () => clearTimeout(t);
  }, [autoPlay, myTurnReady, turnKey]);
}
