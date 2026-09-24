import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export type TableBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  shortSide: number;
};

export type SeatAnchor = {
  x: number;
  y: number;
  /** Absolute left/top for a box centered on the anchor */
  box: (w: number, h: number) => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

export type TrickAnchors = Record<
  'top' | 'bottom' | 'left' | 'right',
  SeatAnchor
>;

/**
 * Table-relative layout (Asset #8).
 * Seats / trick / hand are derived from measured table bounds — not raw screen px.
 * Table size/position matches the locked room layout the player approved.
 */
export function useTableBounds() {
  const [scene, setScene] = useState({ w: 0, h: 0 });

  const onSceneLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScene((prev) =>
      Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
        ? prev
        : { w: width, h: height }
    );
  }, []);

  const table = useMemo((): TableBounds => {
    const W = scene.w || 1;
    const H = scene.h || 1;
    const fit = Math.min(1, Math.max(0, (H - 300) / 160));
    const width = W * (0.88 + 0.08 * fit);
    let height = H * (0.64 + 0.16 * fit);
    const y = H * (0.17 - 0.07 * fit);
    if (y + height > H * 0.9) {
      height = H * 0.9 - y;
    }
    const x = (W - width) / 2;
    const shortSide = Math.min(width, height);

    return {
      x,
      y,
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      centerX: x + width / 2,
      centerY: y + height / 2,
      shortSide,
    };
  }, [scene.w, scene.h]);

  const makeAnchor = useCallback(
    (cx: number, cy: number): SeatAnchor => ({
      x: cx,
      y: cy,
      box: (w, h) => ({
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
      }),
    }),
    []
  );

  const seats = useMemo(() => {
    return {
      // Keep player piles on the rim so they do not cover thrown cards
      top: makeAnchor(table.centerX, table.top + table.height * 0.02),
      left: makeAnchor(table.left + table.width * 0.13, table.centerY),
      right: makeAnchor(table.right - table.width * 0.13, table.centerY),
      bottom: makeAnchor(
        table.centerX,
        table.bottom - table.height * 0.02
      ),
    };
  }, [table, makeAnchor]);

  const trickCard = useMemo(() => {
    const h = Math.min(70, Math.max(54, table.height * 0.2));
    const w = h * (66 / 88);
    return { w, h };
  }, [table.height]);

  const trick = useMemo((): TrickAnchors => {
    const { w, h } = trickCard;
    const gap = 14;
    // Top and bottom need a real gap so the lift does not stack them.
    const midY = table.top + table.height * 0.46;
    const halfStack = h / 2 + 22;
    const side = w + gap;
    return {
      top: makeAnchor(table.centerX, midY - halfStack),
      bottom: makeAnchor(table.centerX, midY + halfStack),
      left: makeAnchor(table.centerX - side, midY),
      right: makeAnchor(table.centerX + side, midY),
    };
  }, [table, trickCard, makeAnchor]);

  const hand = useMemo(() => {
    const w = table.width * 0.58;
    const h = table.shortSide * 0.38;
    return {
      left: table.centerX - w / 2,
      // Lower the fan into the spare bottom space
      top: table.bottom - h * 0.08,
      width: w,
      height: h,
    };
  }, [table]);

  const deck = useMemo(() => {
    const w = table.shortSide * 0.12;
    const h = w * (88 / 66);
    return {
      left: table.right - w * 1.55,
      top: table.bottom - h * 1.35,
      width: w,
      height: h,
    };
  }, [table]);

  const frameSize = {
    default: Math.max(44, Math.min(64, table.shortSide * 0.22)),
    local: Math.max(48, Math.min(72, table.shortSide * 0.26)),
  };

  const ready = scene.w > 0 && scene.h > 0;

  return {
    scene,
    onSceneLayout,
    table,
    seats,
    trick,
    trickCard,
    hand,
    deck,
    frameSize,
    ready,
  };
}

export function absBox(box: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return {
    position: 'absolute' as const,
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
  };
}
