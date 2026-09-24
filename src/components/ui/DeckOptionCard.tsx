import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { cachedAssetSource } from '../../services/preloadAssets';
import { playSfx } from '../../services/audio';
import { triggerHaptic } from '../../services/haptics';

export type DeckOptionCardProps = {
  label: string;
  sub?: string;
  /** Artwork that matches this option’s job (table, lounge, frame, etc.) */
  image: ImageSourcePropType;
  /** Large suit / symbol cue for the action */
  glyph: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Choice card — unique art + glyph per action (not a shared deck-back). */
export function DeckOptionCard({
  label,
  sub,
  image,
  glyph,
  onPress,
  primary,
  disabled,
  style,
}: DeckOptionCardProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={async () => {
        await playSfx('click');
        await triggerHaptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        primary && styles.cardPrimary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Image
        source={cachedAssetSource(image)}
        style={styles.art}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          'rgba(4,12,10,0.2)',
          'rgba(4,12,10,0.55)',
          'rgba(4,12,10,0.94)',
        ]}
        locations={[0.15, 0.5, 1]}
        style={styles.fade}
      />
      <View style={styles.glyphWrap} pointerEvents="none">
        <Text style={[styles.glyph, primary && styles.glyphPrimary]}>
          {glyph}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text
          style={[styles.label, primary && styles.labelPrimary]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {primary ? <View style={styles.glow} pointerEvents="none" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.72,
    maxHeight: 148,
    minHeight: 112,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(214,175,85,0.7)',
    backgroundColor: ART_DECO_PALETTE.emeraldDark,
    justifyContent: 'flex-end',
  },
  cardPrimary: {
    borderColor: ART_DECO_PALETTE.goldLight,
    shadowColor: ART_DECO_PALETTE.gold,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  art: {
    ...StyleSheet.absoluteFill,
  },
  fade: {
    ...StyleSheet.absoluteFill,
  },
  glyphWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
    zIndex: 1,
  },
  glyph: {
    color: 'rgba(240,213,138,0.92)',
    fontSize: 36,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  glyphPrimary: {
    color: '#FFF6D8',
    fontSize: 40,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(240,213,138,0.45)',
    borderRadius: 12,
    margin: 3,
  },
  copy: {
    zIndex: 2,
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 6,
    alignItems: 'center',
  },
  label: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labelPrimary: {
    color: '#FFF6D8',
  },
  sub: {
    marginTop: 2,
    color: 'rgba(247,241,227,0.78)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
