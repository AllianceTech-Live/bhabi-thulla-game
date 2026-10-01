import { useEffect, useMemo } from 'react';
import {
  Image,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { COLORS } from '../../constants/theme';
import { cachedAssetSource } from '../../services/preloadAssets';
import { playSfx } from '../../services/audio';
import { triggerHaptic } from '../../services/haptics';

function px(n: number) {
  return PixelRatio.roundToNearestPixel(n);
}

export type DeckOptionCardProps = {
  label: string;
  sub?: string;
  /** Optional art when there are no peek cards */
  image?: number;
  /** Up to 3 face-up cards for a realistic table peek */
  peekCards?: number[];
  glyph: string;
  onPress: () => void;
  primary?: boolean;
  /** Larger tiles for home / main game picker */
  prominent?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function AnimatedPeekCard({
  src,
  index,
  offset,
  prominent,
  left,
  cardW,
  cardH,
}: {
  src: number;
  index: number;
  offset: number;
  prominent?: boolean;
  left: number;
  cardW: number;
  cardH: number;
}) {
  const float = useSharedValue(0);
  const baseRotate = offset * 7;
  const baseY = offset === 0 ? -4 : 2;
  const liftMax = prominent ? 5 : 4;

  useEffect(() => {
    float.value = withDelay(
      index * 240,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1600 + index * 200,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: 1600 + index * 200,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        false
      )
    );
  }, [float, index]);

  // Translate only — no scale/tilt (those blur small bitmaps on Android).
  const motion = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${baseRotate}deg` },
      {
        translateY:
          baseY +
          interpolate(float.value, [0, 1], [0, -liftMax]),
      },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(120 + index * 90).duration(360)}
      style={[
        styles.peekWrap,
        {
          left,
          width: cardW,
          height: cardH,
          zIndex: offset === 0 ? 3 : index + 1,
        },
      ]}
    >
      <Animated.View style={[styles.peekMotion, motion]}>
        <Image
          source={cachedAssetSource(src)}
          style={{ width: cardW, height: cardH }}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Lobby game tile — clean casino felt + wood/gold frame + card peeks.
 * No animated table photo (looks muddy at tile size).
 */
export function DeckOptionCard({
  label,
  sub,
  image,
  peekCards,
  glyph,
  onPress,
  primary,
  prominent,
  disabled,
  style,
}: DeckOptionCardProps) {
  const peeks = (peekCards ?? []).slice(0, 3);
  const showArt = Boolean(image) && peeks.length === 0;
  const peekMetrics = useMemo(() => {
    // Whole pixels + fixed 3:4 — avoids Android soft filtering on tiny bitmaps.
    const cardW = px(prominent ? 52 : 36);
    const cardH = px(cardW * (4 / 3));
    const overlap = prominent ? 22 : 14;
    const step = Math.max(10, cardW - overlap);
    const fanWidth =
      peeks.length <= 1 ? cardW : cardW + (peeks.length - 1) * step;
    return { cardW, cardH, step, fanWidth };
  }, [peeks.length, prominent]);

  return (
    <Pressable
      disabled={disabled}
      onPress={async () => {
        await playSfx('click');
        await triggerHaptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.outer,
        prominent && styles.outerProminent,
        primary && styles.outerPrimary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={['#A67C52', '#6B3E24', '#3D2314', '#2A160C']}
        locations={[0, 0.28, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wood}
      />
      <View style={styles.goldTrim} pointerEvents="none" />

      <View style={styles.inner}>
        <LinearGradient
          colors={['#127A52', '#0B5A38', '#074028', '#042A1C']}
          locations={[0, 0.4, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,236,180,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={styles.lamp}
          pointerEvents="none"
        />
        <View style={styles.feltGrain} pointerEvents="none" />

        {showArt ? (
          <Image
            source={cachedAssetSource(image!)}
            style={styles.art}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.peekRow} pointerEvents="none">
          {peeks.length > 0 ? (
            <View
              style={[
                styles.peekFan,
                {
                  width: peekMetrics.fanWidth,
                  height: peekMetrics.cardH + 8,
                },
              ]}
            >
              {peeks.map((src, i) => {
                const mid = Math.floor((peeks.length - 1) / 2);
                const offset = i - mid;
                return (
                  <AnimatedPeekCard
                    key={i}
                    src={src}
                    index={i}
                    offset={offset}
                    prominent={prominent}
                    left={i * peekMetrics.step}
                    cardW={peekMetrics.cardW}
                    cardH={peekMetrics.cardH}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={[styles.glyph, primary && styles.glyphPrimary]}>
              {glyph}
            </Text>
          )}
        </View>

        <LinearGradient
          colors={[
            'transparent',
            'rgba(4,12,10,0.3)',
            'rgba(4,12,10,0.94)',
          ]}
          locations={[0.22, 0.55, 1]}
          style={styles.fade}
        />

        <View style={styles.plaque}>
          <LinearGradient
            colors={['rgba(28,22,14,0.96)', 'rgba(8,12,10,0.96)']}
            style={StyleSheet.absoluteFill}
          />
          <Text
            style={[
              styles.label,
              prominent && styles.labelProminent,
              primary && styles.labelPrimary,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {sub ? (
            <Text
              style={[styles.sub, prominent && styles.subProminent]}
              numberOfLines={2}
            >
              {sub}
            </Text>
          ) : null}
        </View>

        {primary ? <View style={styles.glow} pointerEvents="none" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    aspectRatio: 0.72,
    maxHeight: 168,
    minHeight: 128,
    borderRadius: 12,
    padding: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.5)',
    backgroundColor: '#2A160C',
  },
  outerProminent: {
    aspectRatio: undefined,
    flex: 1,
    minHeight: 178,
    maxHeight: 210,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
  },
  outerPrimary: {
    borderColor: ART_DECO_PALETTE.goldLight,
    shadowColor: ART_DECO_PALETTE.gold,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  wood: {
    ...StyleSheet.absoluteFill,
  },
  goldTrim: {
    ...StyleSheet.absoluteFill,
    margin: 2.5,
    borderRadius: 10,
    borderWidth: 1.25,
    borderColor: 'rgba(214,175,85,0.55)',
  },
  inner: {
    flex: 1,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(12,40,28,0.9)',
  },
  lamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  feltGrain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  art: {
    ...StyleSheet.absoluteFill,
    opacity: 0.22,
  },
  peekRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 36,
  },
  peekFan: {
    position: 'relative',
    alignSelf: 'center',
  },
  peekWrap: {
    position: 'absolute',
    bottom: 0,
  },
  peekMotion: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.cardFace,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.28)',
  },
  glyph: {
    color: 'rgba(240,213,138,0.92)',
    fontSize: 30,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  glyphPrimary: {
    color: '#FFF6D8',
    fontSize: 34,
  },
  fade: {
    ...StyleSheet.absoluteFill,
  },
  plaque: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.45)',
    alignItems: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(240,213,138,0.35)',
    borderRadius: 8,
    margin: 1,
  },
  label: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelProminent: {
    fontSize: 14,
    letterSpacing: 0.35,
  },
  labelPrimary: {
    color: '#FFF6D8',
  },
  sub: {
    marginTop: 1,
    color: 'rgba(247,241,227,0.78)',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  subProminent: {
    fontSize: 10,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
