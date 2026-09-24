import { useEffect } from 'react';
import { playMusic, stopMusic } from '../services/audio';

/**
 * Soft table bed while the hand is live. Does not touch deal/shuffle SFX.
 */
export function useTableMusic(active: boolean) {
  useEffect(() => {
    if (active) {
      void playMusic(true);
      return () => {
        void stopMusic();
      };
    }
    void stopMusic();
    return undefined;
  }, [active]);
}
