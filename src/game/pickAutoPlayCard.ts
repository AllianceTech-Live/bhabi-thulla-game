import { chooseCardDeterministic } from './ai/chooseCard';
import type { GameState } from './types';

/** Pick a legal Thulla card for turn-timeout / Auto play. */
export function pickAutoPlayCardId(
  state: GameState,
  playerId: string
): string | null {
  try {
    return chooseCardDeterministic({
      state,
      playerId,
      difficulty: 'easy',
    }).id;
  } catch {
    return null;
  }
}
