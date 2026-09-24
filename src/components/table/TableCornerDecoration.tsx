import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { GAME_THEME } from '../../constants/gameTheme';

type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface TableCornerDecorationProps {
  corner: Corner;
  size?: number;
}

/**
 * Understated stepped / fan marks near the felt edge.
 */
export function TableCornerDecoration({
  corner,
  size = 48,
}: TableCornerDecorationProps) {
  const { colors } = GAME_THEME;
  const rotate =
    corner === 'topLeft'
      ? '0deg'
      : corner === 'topRight'
        ? '90deg'
        : corner === 'bottomRight'
          ? '180deg'
          : '270deg';

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, transform: [{ rotate }] },
        cornerStyle(corner),
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={`cornerGold-${corner}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.goldLight} stopOpacity="0.55" />
            <Stop offset="1" stopColor={colors.goldDark} stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        <Path
          d="M6 28 V14 H20"
          fill="none"
          stroke={`url(#cornerGold-${corner})`}
          strokeWidth="1.2"
          strokeLinecap="square"
        />
        <Path
          d="M10 28 V18 H20"
          fill="none"
          stroke={colors.gold}
          strokeWidth="0.8"
          opacity="0.6"
        />
        <Line
          x1="6"
          y1="32"
          x2="22"
          y2="32"
          stroke={colors.goldMid}
          strokeWidth="0.7"
          opacity="0.5"
        />
        <Path
          d="M24 8 L28 14 L24 18 L20 14 Z"
          fill="none"
          stroke={`url(#cornerGold-${corner})`}
          strokeWidth="0.9"
        />
      </Svg>
    </View>
  );
}

function cornerStyle(corner: Corner): ViewStyle {
  switch (corner) {
    case 'topLeft':
      return { top: '10%', left: '6%' };
    case 'topRight':
      return { top: '10%', right: '6%' };
    case 'bottomLeft':
      return { bottom: '10%', left: '6%' };
    case 'bottomRight':
      return { bottom: '10%', right: '6%' };
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: GAME_THEME.layers.tableDecorations,
  },
});
