import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { Suit } from '../../game/types';

/**
 * Classic playing-card suit silhouettes.
 * viewBox 0 0 24 24, optical center around (12, 12).
 */
const SUIT_PATHS: Record<Suit, string> = {
  spades:
    'M12 1.6C12 1.6 4.6 9.2 4.6 14.1C4.6 17.4 7 19.6 9.8 19.6C10.9 19.6 11.6 19.2 12 18.6C12.4 19.2 13.1 19.6 14.2 19.6C17 19.6 19.4 17.4 19.4 14.1C19.4 9.2 12 1.6 12 1.6ZM9.6 20.2C8.9 20.2 8.6 21 9 21.6L10.2 23.2H13.8L15 21.6C15.4 21 15.1 20.2 14.4 20.2H9.6Z',
  hearts:
    'M12 21.2L10.7 20C5.6 15.4 2.2 12.4 2.2 8.7C2.2 5.8 4.4 3.6 7.3 3.6C8.9 3.6 10.5 4.4 12 5.8C13.5 4.4 15.1 3.6 16.7 3.6C19.6 3.6 21.8 5.8 21.8 8.7C21.8 12.4 18.4 15.4 13.3 20L12 21.2Z',
  diamonds: 'M12 1.4L20.6 12L12 22.6L3.4 12L12 1.4Z',
  clubs:
    'M12 2.2C10.1 2.2 8.6 3.7 8.6 5.6C8.6 6.6 9.1 7.5 9.8 8.1C8.2 8.4 7 9.7 7 11.3C7 13.1 8.4 14.5 10.2 14.5C10.6 14.5 11 14.4 11.3 14.2C11 15.6 10.2 16.4 9.2 16.6C8.6 16.7 8.2 17.2 8.4 17.8C8.7 18.6 9.6 19.1 10.6 19.1H13.4C14.4 19.1 15.3 18.6 15.6 17.8C15.8 17.2 15.4 16.7 14.8 16.6C13.8 16.4 13 15.6 12.7 14.2C13 14.4 13.4 14.5 13.8 14.5C15.6 14.5 17 13.1 17 11.3C17 9.7 15.8 8.4 14.2 8.1C14.9 7.5 15.4 6.6 15.4 5.6C15.4 3.7 13.9 2.2 12 2.2ZM11.2 14.8H12.8V18.2H11.2V14.8Z',
};

type SuitGlyphProps = {
  suit: Suit;
  size: number;
  color: string;
  flip?: boolean;
};

export function SuitGlyph({ suit, size, color, flip }: SuitGlyphProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={flip ? { transform: [{ rotate: '180deg' }] } : undefined}
    >
      <Path d={SUIT_PATHS[suit]} fill={color} />
    </Svg>
  );
}
