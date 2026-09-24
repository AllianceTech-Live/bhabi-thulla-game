import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';
import { GAME_THEME } from '../../constants/gameTheme';
import { useTableScale } from '../../hooks/useTableScale';
import { TableLighting } from './TableLighting';
import { TableCenterOrnament } from './TableCenterOrnament';
import { TableCornerDecoration } from './TableCornerDecoration';

interface TableFeltProps {
  highlightCenter?: boolean;
  showThulla?: boolean;
  children?: React.ReactNode;
}

/**
 * Deep emerald felt surface with texture, lighting, and Deco accents.
 */
export function TableFelt({
  highlightCenter = false,
  showThulla = false,
  children,
}: TableFeltProps) {
  const { colors, layers } = GAME_THEME;
  const s = useTableScale();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.feltLight, colors.feltMid, colors.felt, colors.feltDark]}
        locations={[0, 0.28, 0.62, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.feltFill}
      />

      <View style={styles.texture} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="none">
          <Defs>
            <Pattern
              id="feltDots"
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
            >
              <Circle cx="1.5" cy="1.5" r="0.6" fill="#000" opacity="0.12" />
              <Circle cx="6.5" cy="6" r="0.45" fill="#fff" opacity="0.04" />
            </Pattern>
          </Defs>
          <Rect width="200" height="120" fill="url(#feltDots)" />
        </Svg>
      </View>

      <View
        style={[
          styles.innerGoldLine,
          { borderWidth: Math.max(1, s.borderGold * 0.85) },
        ]}
        pointerEvents="none"
      />

      <TableLighting highlightCenter={highlightCenter || showThulla} />

      <TableCornerDecoration corner="topLeft" size={s.cornerSize} />
      <TableCornerDecoration corner="topRight" size={s.cornerSize} />
      <TableCornerDecoration corner="bottomLeft" size={s.cornerSize} />
      <TableCornerDecoration corner="bottomRight" size={s.cornerSize} />

      <View style={styles.ornament} pointerEvents="none">
        <TableCenterOrnament
          size={s.ornamentSize}
          highlight={highlightCenter || showThulla}
        />
      </View>

      <View style={[styles.overlay, { zIndex: layers.playedCards }]}>
        {children}
      </View>
    </View>
  );
}

const fill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: GAME_THEME.radius.table,
    overflow: 'hidden',
    backgroundColor: GAME_THEME.colors.felt,
  },
  feltFill: {
    ...fill,
    borderRadius: GAME_THEME.radius.table,
  },
  texture: {
    ...fill,
    opacity: 0.9,
  },
  innerGoldLine: {
    position: 'absolute',
    top: '3.5%',
    left: '2.8%',
    right: '2.8%',
    bottom: '3.5%',
    borderRadius: GAME_THEME.radius.table,
    borderColor: 'rgba(200, 155, 60, 0.38)',
  },
  ornament: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: GAME_THEME.layers.tableDecorations,
  },
  overlay: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
