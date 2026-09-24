import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, landscapeAxes } from '../constants/designScale';

/**
 * Menu / setup metrics. Landscape-locked — never flips to portrait sizing.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const { short, long, scale } = landscapeAxes(width, height);
    const landscape = true;
    const layoutWidth = long;
    const layoutHeight = short;
    const compact = short < 400;
    const sideInset = Math.max(insets.left, insets.right);

    return {
      width: layoutWidth,
      height: layoutHeight,
      short,
      long,
      scale,
      landscape,
      compact,
      insets,
      pagePad: ds(14, scale, 10),
      contentMaxWidth: Math.min(
        ds(560, scale, 420),
        layoutWidth - sideInset * 2 - ds(48, scale, 32)
      ),
      btnPadV: ds(9, scale, 7),
      btnPadH: ds(16, scale, 12),
      btnFont: ds(13, scale, 11),
      btnMinH: ds(38, scale, 32),
      titleSize: ds(22, scale, 18),
      subtitleSize: ds(11, scale, 10),
      actionGap: ds(8, scale, 6),
    };
  }, [width, height, insets]);
}
