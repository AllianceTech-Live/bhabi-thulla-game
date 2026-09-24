import { Card } from './types.ts';

/**
 * Fisher–Yates shuffle — unbiased, uses crypto when available.
 * Never use a predictable shuffle for competitive play.
 */
export function shuffleDeck(deck: Card[], randomFn?: () => number): Card[] {
  const result = [...deck];
  const rand = randomFn ?? secureRandom;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }

  return result;
}

/** Prefer crypto.getRandomValues; fall back to Math.random. */
function secureRandom(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! / (0xffffffff + 1);
  }
  return Math.random();
}
