import React from 'react';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { GAME_THEME } from '../../constants/gameTheme';

interface TableCenterOrnamentProps {
  /** ViewBox-relative size; parent controls layout box */
  size?: number;
  /** Soft gold pulse when center is highlighted */
  highlight?: boolean;
}

/**
 * Subtle symmetrical Art Deco center mark.
 * Thin gold lines — stays under played cards.
 */
export function TableCenterOrnament({
  size = 120,
  highlight = false,
}: TableCenterOrnamentProps) {
  const { colors } = GAME_THEME;
  const opacity = highlight ? 0.85 : 0.42;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="ornamentGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.goldLight} stopOpacity={opacity} />
          <Stop offset="0.5" stopColor={colors.gold} stopOpacity={opacity} />
          <Stop offset="1" stopColor={colors.goldDark} stopOpacity={opacity * 0.8} />
        </LinearGradient>
      </Defs>

      {/* Outer diamond */}
      <Path
        d="M60 18 L102 60 L60 102 L18 60 Z"
        fill="none"
        stroke="url(#ornamentGold)"
        strokeWidth="1.2"
      />

      {/* Inner diamond */}
      <Path
        d="M60 34 L86 60 L60 86 L34 60 Z"
        fill="none"
        stroke="url(#ornamentGold)"
        strokeWidth="0.9"
        opacity={0.9}
      />

      {/* Cross axes */}
      <Line
        x1="20"
        y1="60"
        x2="100"
        y2="60"
        stroke="url(#ornamentGold)"
        strokeWidth="1"
      />
      <Line
        x1="60"
        y1="20"
        x2="60"
        y2="100"
        stroke="url(#ornamentGold)"
        strokeWidth="1"
      />

      {/* Fan rays — top */}
      <Path
        d="M60 42 L48 28 M60 42 L60 24 M60 42 L72 28"
        fill="none"
        stroke="url(#ornamentGold)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* Fan rays — bottom */}
      <Path
        d="M60 78 L48 92 M60 78 L60 96 M60 78 L72 92"
        fill="none"
        stroke="url(#ornamentGold)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Tiny apex diamonds */}
      <Path
        d="M60 12 L64 18 L60 22 L56 18 Z"
        fill={colors.gold}
        opacity={opacity * 0.7}
      />
      <Path
        d="M60 98 L64 102 L60 108 L56 102 Z"
        fill={colors.gold}
        opacity={opacity * 0.7}
      />
      <Path
        d="M12 60 L18 56 L22 60 L18 64 Z"
        fill={colors.gold}
        opacity={opacity * 0.55}
      />
      <Path
        d="M98 60 L102 56 L108 60 L102 64 Z"
        fill={colors.gold}
        opacity={opacity * 0.55}
      />
    </Svg>
  );
}
