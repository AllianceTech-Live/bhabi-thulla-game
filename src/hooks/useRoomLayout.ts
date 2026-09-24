import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { ds, landscapeAxes } from '../constants/designScale';

/**
 * In-game HUD metrics — same proportions on every landscape device.
 */
export function useRoomLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const { short, long, scale } = landscapeAxes(width, height);
    const control = ds(40, scale, 32);
    const edge = ds(8, scale, 6);
    const gap = ds(8, scale, 6);
    const leftNudge = ds(18, scale, 12);
    const socialWidth = control * 3 + gap * 2;
    return {
      scale,
      short,
      long,
      control,
      edge,
      leftNudge,
      gap,
      gutter: socialWidth + edge + leftNudge,
      compactHand: short < 400,
      handBottom: edge - ds(16, scale, 10),
      youBottom: edge + control + gap,
    };
  }, [width, height]);
}
