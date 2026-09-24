import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DEBUG_GAME_LAYOUT, GAME_THEME } from '../../constants/gameTheme';
import type { TableBounds } from '../../hooks/useTableBounds';

type Props = {
  table: TableBounds;
  seats: Record<string, { x: number; y: number }>;
  trick: Record<string, { x: number; y: number }>;
  hand?: { left: number; top: number; width: number; height: number };
};

/** Dev-only overlay — toggle via DEBUG_GAME_LAYOUT */
export function LayoutDebug({ table, seats, trick, hand }: Props) {
  if (!DEBUG_GAME_LAYOUT) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      <View
        style={[
          styles.box,
          {
            left: table.x,
            top: table.y,
            width: table.width,
            height: table.height,
            borderColor: '#00E5FF',
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          { left: table.centerX - 4, top: table.centerY - 4, backgroundColor: '#00E5FF' },
        ]}
      />
      {Object.entries(seats).map(([k, p]) => (
        <View
          key={`s-${k}`}
          style={[
            styles.dot,
            { left: p.x - 5, top: p.y - 5, backgroundColor: '#FFD54F' },
          ]}
        />
      ))}
      {Object.entries(trick).map(([k, p]) => (
        <View
          key={`t-${k}`}
          style={[
            styles.dot,
            { left: p.x - 4, top: p.y - 4, backgroundColor: '#FF5252' },
          ]}
        />
      ))}
      {hand && (
        <View
          style={[
            styles.box,
            {
              left: hand.left,
              top: hand.top,
              width: hand.width,
              height: hand.height,
              borderColor: '#69F0AE',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: GAME_THEME.layers.systemOverlay,
  },
  box: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
