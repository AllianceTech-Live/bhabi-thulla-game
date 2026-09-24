import type { Rank, Suit } from '../../game/types';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';

/** Card face / back visual tokens (Asset #3–4 language) */
export const CARD_STYLE = {
  face: '#F7F1E3',
  faceEdge: '#E8DFC8',
  goldBorder: ART_DECO_PALETTE.gold,
  goldBorderSoft: ART_DECO_PALETTE.goldLight,
  black: ART_DECO_PALETTE.rail,
  suitRed: ART_DECO_PALETTE.suitRed,
  courtFill: '#FBF7EE',
  selectedGlow: ART_DECO_PALETTE.gold,
  /** Asset #7 — 66×88 (3:4) mobile card */
  aspect: 66 / 88,
  sizes: {
    default: { w: 66, h: 88 },
    compact: { w: 52, h: 70 },
    mini: { w: 36, h: 48 },
  },
} as const;

export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds'
    ? CARD_STYLE.suitRed
    : CARD_STYLE.black;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function isFaceRank(rank: Rank): boolean {
  return rank === 'J' || rank === 'Q' || rank === 'K';
}

/**
 * Classic pip positions in card viewBox (0–100 × 0–140).
 * Each point is the center of a suit glyph; `flip` marks bottom-half pips.
 */
export type Pip = { x: number; y: number; flip?: boolean };

const COL = { L: 32, C: 50, R: 68 };
const ROW = {
  T1: 28,
  T2: 40,
  M: 70,
  B2: 100,
  B1: 112,
};

export const PIP_LAYOUTS: Record<Exclude<Rank, 'J' | 'Q' | 'K'>, Pip[]> = {
  A: [{ x: COL.C, y: ROW.M }],
  '2': [
    { x: COL.C, y: ROW.T1 },
    { x: COL.C, y: ROW.B1, flip: true },
  ],
  '3': [
    { x: COL.C, y: ROW.T1 },
    { x: COL.C, y: ROW.M },
    { x: COL.C, y: ROW.B1, flip: true },
  ],
  '4': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '5': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.C, y: ROW.M },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '6': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.L, y: ROW.M },
    { x: COL.R, y: ROW.M },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '7': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.C, y: ROW.T2 },
    { x: COL.L, y: ROW.M },
    { x: COL.R, y: ROW.M },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '8': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.C, y: ROW.T2 },
    { x: COL.L, y: ROW.M },
    { x: COL.R, y: ROW.M },
    { x: COL.C, y: ROW.B2, flip: true },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '9': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.L, y: 48 },
    { x: COL.R, y: 48 },
    { x: COL.C, y: ROW.M },
    { x: COL.L, y: 92, flip: true },
    { x: COL.R, y: 92, flip: true },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
  '10': [
    { x: COL.L, y: ROW.T1 },
    { x: COL.R, y: ROW.T1 },
    { x: COL.C, y: 36 },
    { x: COL.L, y: 52 },
    { x: COL.R, y: 52 },
    { x: COL.L, y: 88, flip: true },
    { x: COL.R, y: 88, flip: true },
    { x: COL.C, y: 104, flip: true },
    { x: COL.L, y: ROW.B1, flip: true },
    { x: COL.R, y: ROW.B1, flip: true },
  ],
};
