import React, { memo } from 'react';
import { Image, PixelRatio, StyleSheet, View } from 'react-native';
import type { Card } from '../../game/types';
import { CARD_FACES } from './cardFaces';

type CardFaceProps = {
  card: Card;
  width: number;
  height: number;
};

function px(n: number) {
  return PixelRatio.roundToNearestPixel(n);
}

/** Standard public-domain faces for all 52 cards. */
export const CardFace = memo(function CardFace({
  card,
  width,
  height,
}: CardFaceProps) {
  const w = px(width);
  const h = px(height);
  const radius = px(h * 0.06);

  return (
    <View style={[styles.photo, { width: w, height: h, borderRadius: radius }]}>
      <Image
        source={CARD_FACES[card.suit][card.rank]}
        style={{ width: w, height: h }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  photo: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
