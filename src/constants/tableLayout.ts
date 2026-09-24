/**
 * Bhabi Thulla — full-screen composition (Asset #8 master blueprint).
 *
 * Source of truth: `assets/game/reference/full-screen-blueprint.jpg`
 * All values are normalized fractions of the **game scene** (0–1), landscape 16:9.
 */
export type NormRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NormPoint = { x: number; y: number };

/**
 * Asset #8 layout contract:
 * Environment · Table · 4 seats · fans · center trick · your hand ·
 * bottom controls · side controls · room code · branding
 */
export const TABLE_COMPOSITION = {
  /** Oval table — dominant center */
  table: { x: 0.1, y: 0.08, w: 0.8, h: 0.58 } satisfies NormRect,

  seats: {
    top: { x: 0.5, y: 0.1 } satisfies NormPoint,
    left: { x: 0.1, y: 0.4 } satisfies NormPoint,
    right: { x: 0.9, y: 0.4 } satisfies NormPoint,
    /** Local — above hand dock */
    bottom: { x: 0.5, y: 0.7 } satisfies NormPoint,
  },

  seatFrame: {
    default: 0.13,
    local: 0.15,
    small: 0.1,
  },

  opponentFans: {
    top: { x: 0.5, y: 0.2, w: 0.14, h: 0.07 } satisfies NormRect,
    left: { x: 0.18, y: 0.36, w: 0.07, h: 0.12 } satisfies NormRect,
    right: { x: 0.75, y: 0.36, w: 0.07, h: 0.12 } satisfies NormRect,
  },

  trick: {
    well: { x: 0.38, y: 0.3, w: 0.24, h: 0.26 } satisfies NormRect,
    slots: {
      top: { x: 0.5, y: 0.32 } satisfies NormPoint,
      bottom: { x: 0.5, y: 0.5 } satisfies NormPoint,
      left: { x: 0.42, y: 0.41 } satisfies NormPoint,
      right: { x: 0.58, y: 0.41 } satisfies NormPoint,
    },
    cardScale: 0.1,
  },

  /** Face-up local hand overlapping table bottom edge */
  hand: {
    zone: { x: 0.18, y: 0.68, w: 0.52, h: 0.2 } satisfies NormRect,
    cardScale: 0.155,
  },

  /** Local nameplate under hand ("You" + count) */
  localTag: { x: 0.5, y: 0.9 } satisfies NormPoint,

  /** Draw pile on lower-right felt edge */
  deck: { x: 0.82, y: 0.62 } satisfies NormPoint,

  uiSafe: {
    topRight: { x: 0.68, y: 0.02, w: 0.3, h: 0.1 } satisfies NormRect,
    bottomLeft: { x: 0.02, y: 0.86, w: 0.22, h: 0.12 } satisfies NormRect,
    bottomRight: { x: 0.7, y: 0.84, w: 0.28, h: 0.14 } satisfies NormRect,
    midRight: { x: 0.92, y: 0.48, w: 0.07, h: 0.2 } satisfies NormRect,
  },

  chrome: {
    /** Branding lives in environment art — soft HUD echo top-left */
    logo: { x: 0.1, y: 0.05 } satisfies NormPoint,
    roomCode: { x: 0.78, y: 0.055 } satisfies NormPoint,
    settings: { x: 0.9, y: 0.055 } satisfies NormPoint,
    connection: { x: 0.955, y: 0.055 } satisfies NormPoint,
    /** Bottom-left social cluster */
    chat: { x: 0.06, y: 0.92 } satisfies NormPoint,
    emoji: { x: 0.12, y: 0.92 } satisfies NormPoint,
    voice: { x: 0.18, y: 0.92 } satisfies NormPoint,
    /** Bottom-right actions */
    sort: { x: 0.72, y: 0.9 } satisfies NormPoint,
    autoSort: { x: 0.82, y: 0.9 } satisfies NormPoint,
    play: { x: 0.93, y: 0.9 } satisfies NormPoint,
    /** Mid-right utilities */
    hint: { x: 0.955, y: 0.5 } satisfies NormPoint,
    history: { x: 0.955, y: 0.6 } satisfies NormPoint,
    deck: { x: 0.82, y: 0.62 } satisfies NormPoint,
  },

  controls: {
    pass: { x: 0.06, y: 0.92 } satisfies NormPoint,
    sort: { x: 0.72, y: 0.9 } satisfies NormPoint,
    primary: { x: 0.93, y: 0.9 } satisfies NormPoint,
  },
} as const;

export type TableComposition = typeof TABLE_COMPOSITION;

export function resolveRect(
  rect: NormRect,
  sceneW: number,
  sceneH: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: rect.x * sceneW,
    top: rect.y * sceneH,
    width: rect.w * sceneW,
    height: rect.h * sceneH,
  };
}

export function resolveCentered(
  point: NormPoint,
  boxW: number,
  boxH: number,
  sceneW: number,
  sceneH: number
): { left: number; top: number; width: number; height: number } {
  const cx = point.x * sceneW;
  const cy = point.y * sceneH;
  return {
    left: cx - boxW / 2,
    top: cy - boxH / 2,
    width: boxW,
    height: boxH,
  };
}
