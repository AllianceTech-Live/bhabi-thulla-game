import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GAME_THEME } from '../constants/gameTheme';
import { clamp, landscapeAxes } from '../constants/designScale';

export type TableScale = {
  shortSide: number;
  longSide: number;
  width: number;
  height: number;
  /** 1 = design reference short side */
  scale: number;
  bodyPad: number;
  goldPad: number;
  gutterPad: number;
  hairlinePad: number;
  borderGold: number;
  ornamentSize: number;
  cornerSize: number;
  panelWidth: number;
};

const TableScaleContext = createContext<TableScale | null>(null);

export function useTableScale(): TableScale {
  const ctx = useContext(TableScaleContext);
  const fallback = useWindowTableMetrics();
  return ctx ?? fallback;
}

/** Window-based metrics when table hasn't laid out yet / for background */
export function useWindowTableMetrics(): TableScale {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const { long, short } = landscapeAxes(width, height);
    const availW = Math.max(0, long - insets.left - insets.right);
    const availH = Math.max(0, short - insets.top - insets.bottom);
    const tw = availW * GAME_THEME.layout.tableWidthPct;
    const th = Math.min(availH * GAME_THEME.layout.tableHeightPct, tw * 0.55);
    return buildScale(tw, th, short);
  }, [width, height, insets.left, insets.right, insets.top, insets.bottom]);
}

export function buildScale(
  width: number,
  height: number,
  viewportShort?: number
): TableScale {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  const { scale } = landscapeAxes(
    viewportShort ? Math.max(longSide, viewportShort * 1.6) : longSide,
    viewportShort ?? shortSide
  );

  return {
    shortSide,
    longSide,
    width: w,
    height: h,
    scale,
    bodyPad: Math.round(8 * scale + 2),
    goldPad: Math.max(2, Math.round(3.5 * scale)),
    gutterPad: Math.max(3, Math.round(5 * scale)),
    hairlinePad: Math.max(1, Math.round(2 * scale)),
    borderGold: Math.max(1, Math.round(1.5 * scale)),
    ornamentSize: Math.round(Math.min(shortSide * 0.42, 140 * scale)),
    cornerSize: Math.round(Math.min(shortSide * 0.18, 52 * scale)),
    panelWidth: Math.round(
      clamp((viewportShort ?? shortSide) * 0.045, 18, 40)
    ),
  };
}

export const TableScaleProvider = TableScaleContext.Provider;
