import React, { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';

type Props = { size: number };

/** Asset #5 frame as true SVG — no black raster square behind it. */
export const PlayerFrameRing = memo(function PlayerFrameRing({ size }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs>
        <LinearGradient id="pfGold" x1="18" y1="14" x2="110" y2="114">
          <Stop offset="0%" stopColor={ART_DECO_PALETTE.goldLight} />
          <Stop offset="42%" stopColor={ART_DECO_PALETTE.gold} />
          <Stop offset="100%" stopColor={ART_DECO_PALETTE.goldDeep} />
        </LinearGradient>
        <LinearGradient id="pfGoldSoft" x1="64" y1="8" x2="64" y2="120">
          <Stop offset="0%" stopColor="#E8C96A" />
          <Stop offset="100%" stopColor={ART_DECO_PALETTE.goldDark} />
        </LinearGradient>
      </Defs>

      <Circle cx="64" cy="64" r="58" stroke="url(#pfGold)" strokeWidth="6" fill="none" />
      <Circle
        cx="64"
        cy="64"
        r="52.5"
        stroke={ART_DECO_PALETTE.rail}
        strokeWidth="3.5"
        fill="none"
      />
      <Circle
        cx="64"
        cy="64"
        r="49"
        stroke="url(#pfGoldSoft)"
        strokeWidth="1.75"
        fill="none"
      />

      <G stroke="url(#pfGold)" strokeLinecap="round" fill="none">
        <Path d="M64 6 L64 18" strokeWidth="1.6" />
        <Path d="M58 8 L64 18 L70 8" strokeWidth="1.2" />
        <Path d="M54 10 L64 20 L74 10" strokeWidth="1" />
        <Path d="M50 13 L64 22 L78 13" strokeWidth="0.9" />
      </G>
      <Circle cx="64" cy="20" r="2.2" fill={ART_DECO_PALETTE.gold} />

      <Path d="M64 118 L67.5 112 L64 107 L60.5 112 Z" fill={ART_DECO_PALETTE.gold} />
      <Line
        x1="56"
        y1="112"
        x2="72"
        y2="112"
        stroke={ART_DECO_PALETTE.goldDark}
        strokeWidth="0.9"
      />

      <G
        stroke={ART_DECO_PALETTE.goldMid}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      >
        <Path d="M10 58 L16 64 L10 70" />
        <Path d="M14 56 L21 64 L14 72" />
        <Path d="M118 58 L112 64 L118 70" />
        <Path d="M114 56 L107 64 L114 72" />
      </G>
    </Svg>
  );
});
