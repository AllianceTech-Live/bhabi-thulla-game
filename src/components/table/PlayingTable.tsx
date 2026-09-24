import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  Image as SvgImage,
  Rect,
} from 'react-native-svg';
import { GAME_ASSETS } from '../../constants/gameAssets';
import { GAME_THEME } from '../../constants/gameTheme';
import { cachedAssetSource } from '../../services/preloadAssets';

export interface PlayingTableProps {
  activePlayer?: number | null;
  showThulla?: boolean;
  highlightCenter?: boolean;
  showTrickSlots?: boolean;
  children?: React.ReactNode;
  fill?: boolean;
  width?: number;
  height?: number;
}

function tableImageUri(): string | undefined {
  const cached = cachedAssetSource(GAME_ASSETS.table);
  if (typeof cached === 'object' && cached.uri) return cached.uri;
  if (typeof Image.resolveAssetSource !== 'function') return undefined;
  try {
    return Image.resolveAssetSource(GAME_ASSETS.table)?.uri;
  } catch {
    return undefined;
  }
}

/**
 * Asset #2 table — clipped to oval so black raster padding never reads as a layer box.
 */
export function PlayingTable({
  activePlayer: _activePlayer = null,
  showThulla = false,
  highlightCenter = false,
  showTrickSlots = false,
  children,
  fill = true,
  width: widthOverride,
  height: heightOverride,
}: PlayingTableProps) {
  const { layers, colors } = GAME_THEME;
  void _activePlayer;
  void showThulla;
  void highlightCenter;

  const [size, setSize] = useState({ w: 320, h: 180 });

  const onLayout = (e: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    const { width, height } = e.nativeEvent.layout;
    if (width < 2 || height < 2) return;
    setSize((prev) =>
      Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
        ? prev
        : { w: width, h: height }
    );
  };

  const tableUri = tableImageUri();
  const w = widthOverride ?? size.w;
  const h = heightOverride ?? size.h;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.485;
  const ry = h * 0.485;

  const slots = useMemo(() => {
    const cw = Math.min(w, h) * 0.16;
    const ch = cw * (88 / 66);
    const dx = w * 0.09;
    const dy = h * 0.14;
    return [
      { x: cx - cw / 2, y: cy - dy - ch / 2, w: cw, h: ch },
      { x: cx - cw / 2, y: cy + dy - ch / 2, w: cw, h: ch },
      { x: cx - dx - cw / 2, y: cy - ch / 2, w: cw, h: ch },
      { x: cx + dx - cw / 2, y: cy - ch / 2, w: cw, h: ch },
    ];
  }, [w, h, cx, cy]);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.shell,
        fill ? styles.fill : { width: w, height: h },
        { zIndex: layers.playingTable },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Bhabi Thulla playing table"
    >
      {tableUri ? (
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
          <Defs>
            <ClipPath id="tableOval">
              <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={{ uri: tableUri }}
            x={0}
            y={0}
            width={w}
            height={h}
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#tableOval)"
          />
          {showTrickSlots &&
            slots.map((s, i) => (
              <Rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={4}
                fill="none"
                stroke={colors.ivory}
                strokeOpacity={0.35}
                strokeWidth={1.2}
              />
            ))}
        </Svg>
      ) : (
        <Image
          source={cachedAssetSource(GAME_ASSETS.table)}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}

      <View style={styles.children} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    maxWidth: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  children: {
    ...StyleSheet.absoluteFill,
  },
});
