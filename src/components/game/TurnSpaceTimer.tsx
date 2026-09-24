import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';

type TurnSpaceTimerProps = {
  width: number;
  height: number;
  /** 1 = full time left, 0 = expired */
  progress: number;
  secondsLeft: number;
  urgent?: boolean;
};

/**
 * Rectangular gold border around a player's table card space.
 * The stroke drains as the turn clock runs; seconds sit in the middle.
 */
export function TurnSpaceTimer({
  width,
  height,
  progress,
  secondsLeft,
  urgent,
}: TurnSpaceTimerProps) {
  const radius = Math.max(4, height * 0.08);
  const stroke = Math.max(2.5, Math.min(4, width * 0.045));
  const inset = stroke / 2;
  const rw = Math.max(1, width - stroke);
  const rh = Math.max(1, height - stroke);
  const peri = useMemo(() => {
    // Rounded-rect perimeter approximation
    return 2 * (rw + rh) - (8 - 2 * Math.PI) * radius * 0.35;
  }, [rw, rh, radius]);

  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = peri * (1 - clamped);
  const color = urgent ? '#E85D4C' : ART_DECO_PALETTE.gold;

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect
          x={inset}
          y={inset}
          width={rw}
          height={rh}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="rgba(214,175,85,0.22)"
          strokeWidth={stroke}
        />
        <Rect
          x={inset}
          y={inset}
          width={rw}
          height={rh}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${peri} ${peri}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.badge, urgent && styles.badgeUrgent]}>
        <Text style={[styles.badgeText, urgent && styles.badgeTextUrgent]}>
          {Math.max(0, secondsLeft)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(8,11,11,0.88)',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    alignItems: 'center',
  },
  badgeUrgent: {
    borderColor: '#E85D4C',
    backgroundColor: 'rgba(80,18,14,0.92)',
  },
  badgeText: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  badgeTextUrgent: {
    color: '#FFB4A8',
  },
});
