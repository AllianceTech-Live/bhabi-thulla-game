import { useEffect, useRef, useState } from 'react';

type UseTurnTimerArgs = {
  /** Changes when the turn seat / trick advances — resets the clock. */
  turnKey: string | null;
  durationMs: number;
  /** When true, fires onTimeout once at zero (local human). */
  enableTimeout?: boolean;
  onTimeout?: () => void;
};

/**
 * Counts down every turn for seat UI. Timeout only when enableTimeout.
 */
export function useTurnTimer({
  turnKey,
  durationMs,
  enableTimeout = false,
  onTimeout,
}: UseTurnTimerArgs): { secondsLeft: number | null; progress: number } {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState(1);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const firedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!turnKey) {
      setSecondsLeft(null);
      setProgress(1);
      return;
    }

    firedKey.current = null;
    const started = Date.now();
    setSecondsLeft(Math.ceil(durationMs / 1000));
    setProgress(1);

    const id = setInterval(() => {
      const leftMs = durationMs - (Date.now() - started);
      const p = Math.max(0, Math.min(1, leftMs / durationMs));
      setProgress(p);
      if (leftMs <= 0) {
        clearInterval(id);
        setSecondsLeft(0);
        setProgress(0);
        if (
          enableTimeout &&
          onTimeoutRef.current &&
          firedKey.current !== turnKey
        ) {
          firedKey.current = turnKey;
          onTimeoutRef.current();
        }
        return;
      }
      setSecondsLeft(Math.max(1, Math.ceil(leftMs / 1000)));
    }, 100);

    return () => clearInterval(id);
  }, [turnKey, durationMs, enableTimeout]);

  return {
    secondsLeft: turnKey ? secondsLeft : null,
    progress: turnKey ? progress : 1,
  };
}
