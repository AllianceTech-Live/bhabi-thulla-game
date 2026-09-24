/**
 * Locked design system for Bhabi Thulla.
 *
 * The whole app is landscape-only. Every screen scales from one reference
 * phone so small and large devices keep the same proportions and feel.
 *
 * Reference: ~844 × 390 logical pts (common iPhone landscape).
 */
export const DESIGN = {
  refLong: 844,
  refShort: 390,
  /** Floor — SE phones / short landscape */
  minScale: 0.72,
  /** Ceiling — tablets / large phones */
  maxScale: 1.12,
} as const;

export type DesignAxes = {
  /** Always the wider axis (landscape width). */
  long: number;
  /** Always the shorter axis (landscape height). */
  short: number;
  /** 1 = reference short side. */
  scale: number;
};

/** Normalize Dimensions even if iOS briefly swaps axes. */
export function landscapeAxes(width: number, height: number): DesignAxes {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const scale = Math.min(
    DESIGN.maxScale,
    Math.max(DESIGN.minScale, short / DESIGN.refShort)
  );
  return { long, short, scale };
}

/** Scale a design-token size (pts at reference). */
export function ds(value: number, scale: number, min = 1): number {
  return Math.max(min, Math.round(value * scale));
}

/** Soft clamp used for card / seat sizes. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
