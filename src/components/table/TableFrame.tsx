import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GAME_THEME } from '../../constants/gameTheme';
import { useTableScale } from '../../hooks/useTableScale';

interface TableFrameProps {
  children: React.ReactNode;
}

/**
 * Physical table body: dark shell → gold trim → dark lip → felt well.
 * Padding scales with table size.
 */
export function TableFrame({ children }: TableFrameProps) {
  const { colors } = GAME_THEME;
  const s = useTableScale();

  return (
    <View style={[styles.outerShadow, GAME_THEME.shadows.table]}>
      <LinearGradient
        colors={[
          colors.marbleLight,
          colors.marble,
          colors.charcoal,
          colors.black,
          colors.marble,
        ]}
        locations={[0, 0.2, 0.5, 0.78, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.body, { padding: s.bodyPad }]}
      >
        <View
          style={[styles.bevelHighlight, { height: Math.max(2, s.scale * 3) }]}
          pointerEvents="none"
        />

        <LinearGradient
          colors={[
            colors.goldLight,
            colors.goldMid,
            colors.goldDark,
            colors.goldMid,
            colors.goldLight,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.goldTrim, { padding: s.goldPad }]}
        >
          <View
            style={[
              styles.darkGutter,
              { padding: s.gutterPad, backgroundColor: colors.charcoal },
            ]}
          >
            <View
              style={[
                styles.goldHairline,
                {
                  padding: s.hairlinePad,
                  borderWidth: s.borderGold,
                  borderColor: colors.gold,
                },
              ]}
            >
              {children}
            </View>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.lowerShade,
            {
              left: s.bodyPad + 4,
              right: s.bodyPad + 4,
              bottom: Math.max(4, s.bodyPad * 0.5),
              height: Math.max(6, s.scale * 10),
            },
          ]}
          pointerEvents="none"
        />
      </LinearGradient>
    </View>
  );
}

const R = GAME_THEME.radius.table;

const styles = StyleSheet.create({
  outerShadow: {
    flex: 1,
    borderRadius: R,
  },
  body: {
    flex: 1,
    borderRadius: R,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bevelHighlight: {
    position: 'absolute',
    top: 3,
    left: '12%',
    right: '12%',
    borderRadius: 2,
    backgroundColor: 'rgba(240, 213, 138, 0.22)',
  },
  goldTrim: {
    flex: 1,
    borderRadius: R,
  },
  darkGutter: {
    flex: 1,
    borderRadius: R,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.55)',
  },
  goldHairline: {
    flex: 1,
    borderRadius: R,
    backgroundColor: 'rgba(168, 121, 36, 0.12)',
  },
  lowerShade: {
    position: 'absolute',
    borderBottomLeftRadius: R,
    borderBottomRightRadius: R,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
