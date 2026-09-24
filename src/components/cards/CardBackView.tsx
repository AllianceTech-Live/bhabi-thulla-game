import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { GAME_ASSETS } from '../../constants/gameAssets';
import { CARD_STYLE } from './cardStyle';
import { cachedAssetSource } from '../../services/preloadAssets';

type CardBackViewProps = {
  width: number;
  height: number;
  glow?: boolean;
  muted?: boolean;
};

/**
 * Asset #4 card back — clipped to card radius so black raster padding
 * never shows as a floating layer box.
 */
export const CardBackView = memo(function CardBackView({
  width,
  height,
  glow,
  muted,
}: CardBackViewProps) {
  const radius = Math.max(4, height * 0.08);
  return (
    <View
      style={[
        styles.shell,
        {
          width,
          height,
          borderRadius: radius,
          borderColor: glow ? CARD_STYLE.selectedGlow : CARD_STYLE.goldBorder,
          borderWidth: glow ? 2 : 1,
          shadowOpacity: glow ? 0.55 : 0.28,
          shadowRadius: glow ? 10 : 4,
          opacity: muted ? 0.45 : 1,
        },
      ]}
    >
      <Image
        source={cachedAssetSource(GAME_ASSETS.cardBack)}
        style={{ width, height }}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: CARD_STYLE.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
