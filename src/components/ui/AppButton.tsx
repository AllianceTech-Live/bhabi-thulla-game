import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { COLORS, FONTS } from '../../constants/theme';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { playSfx } from '../../services/audio';
import { triggerHaptic } from '../../services/haptics';
import { GameBackground } from '../table/GameBackground';
import { BackHeader } from './BackHeader';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Stretch to fill row in landscape grids */
  flex?: boolean;
  compact?: boolean;
  /** Hide the left emblem chip */
  plain?: boolean;
  /** Optional left emblem (defaults by variant) */
  glyph?: string;
}

const VARIANT_GLYPH: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '✦',
  secondary: '◆',
  ghost: '',
  danger: '✕',
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textStyle,
  flex,
  compact: _compact,
  plain = false,
  glyph,
}: ButtonProps) {
  const layout = useResponsiveLayout();
  const isGhost = variant === 'ghost';
  const emblem = glyph ?? VARIANT_GLYPH[variant];
  const showChip = !plain && !isGhost && !!emblem;
  const chip = Math.max(22, Math.round(layout.btnMinH * 0.55));

  return (
    <Pressable
      disabled={disabled}
      hitSlop={isGhost ? 10 : 6}
      onPress={async () => {
        Keyboard.dismiss();
        await playSfx('click');
        await triggerHaptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: layout.btnPadV,
          paddingHorizontal: isGhost ? layout.btnPadH - 2 : layout.btnPadH,
          marginVertical: 3,
          minHeight: layout.btnMinH,
        },
        styles[variant],
        flex && styles.flex,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {showChip ? (
        <View
          style={[
            styles.cardChip,
            {
              width: chip,
              height: chip,
              borderRadius: chip / 2,
            },
            variant === 'primary' && styles.cardChipOnGold,
            variant === 'danger' && styles.cardChipDanger,
          ]}
        >
          <Text
            style={[
              styles.chipGlyph,
              { fontSize: Math.max(11, Math.round(chip * 0.45)) },
              variant === 'primary' && styles.chipGlyphOnGold,
              variant === 'danger' && styles.chipGlyphDanger,
            ]}
          >
            {emblem}
          </Text>
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.text,
          { fontSize: layout.btnFont, flexShrink: 1 },
          variant === 'ghost' && styles.ghostText,
          variant === 'secondary' && styles.secondaryText,
          variant === 'danger' && styles.dangerText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Screen({
  children,
  style,
  centered,
  showBack = true,
  onBack,
  backTitle,
  scroll = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  centered?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  backTitle?: string;
  /** Scroll content so landscape pages are not clipped. Default true. */
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();

  const pad = {
    paddingTop: layout.landscape ? 4 : 10,
    paddingBottom: Math.max(insets.bottom, 16),
    paddingHorizontal:
      layout.pagePad + Math.max(insets.left, insets.right) / 2,
  };

  const inner = (
    <View
      style={[
        styles.screenInner,
        layout.landscape && {
          maxWidth: layout.contentMaxWidth,
          width: '100%',
        },
        centered && styles.screenCentered,
      ]}
    >
      {children}
    </View>
  );

  return (
    <GameBackground>
      <View style={styles.screen}>
        {showBack ? (
          <BackHeader title={backTitle} onBack={onBack} />
        ) : (
          <View style={{ height: Math.max(insets.top, 4) }} />
        )}
        <KeyboardAvoidingView
          style={styles.screenFlex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={layout.landscape ? 8 : 0}
        >
          {scroll ? (
            <ScrollView
              style={styles.screenFlex}
              contentContainerStyle={[
                styles.scrollContent,
                pad,
                centered && styles.scrollCentered,
                style,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces
            >
              {inner}
            </ScrollView>
          ) : (
            <View style={[styles.screenTouch, pad, centered && styles.screenCentered, style]}>
              {inner}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </GameBackground>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const layout = useResponsiveLayout();
  return (
    <Text style={[styles.title, { fontSize: layout.titleSize }]}>
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const layout = useResponsiveLayout();
  return (
    <Text
      style={[
        styles.subtitle,
        {
          fontSize: layout.subtitleSize,
          marginBottom: layout.landscape ? 10 : 18,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/** Wrap buttons in a responsive row/grid for landscape. */
export function ButtonRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const layout = useResponsiveLayout();
  return (
    <View
      style={[
        styles.buttonRow,
        layout.landscape && styles.buttonRowLandscape,
        { gap: layout.actionGap },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenFlex: {
    flex: 1,
  },
  screenTouch: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollCentered: {
    justifyContent: 'center',
  },
  screenCentered: {
    alignItems: 'center',
  },
  screenInner: {
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontFamily: FONTS.display,
    color: COLORS.goldSoft,
    textAlign: 'center',
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(247,241,227,0.62)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  base: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    overflow: 'hidden',
  },
  cardChip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.85)',
    backgroundColor: ART_DECO_PALETTE.emeraldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardChipOnGold: {
    borderColor: 'rgba(26,18,12,0.35)',
    backgroundColor: 'rgba(26,18,12,0.18)',
  },
  cardChipDanger: {
    borderColor: 'rgba(232,93,76,0.7)',
    backgroundColor: 'rgba(232,93,76,0.12)',
  },
  chipGlyph: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
  },
  chipGlyphOnGold: {
    color: COLORS.ink,
  },
  chipGlyphDanger: {
    color: COLORS.danger,
  },
  flex: {
    flex: 1,
  },
  primary: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldSoft,
  },
  secondary: {
    backgroundColor: 'rgba(8,11,11,0.72)',
    borderColor: 'rgba(214,175,85,0.75)',
  },
  ghost: {
    backgroundColor: 'rgba(8,11,11,0.45)',
    borderColor: 'rgba(214,175,85,0.55)',
  },
  danger: {
    backgroundColor: 'rgba(8,11,11,0.72)',
    borderColor: 'rgba(232,93,76,0.85)',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.38,
  },
  text: {
    color: COLORS.ink,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  ghostText: {
    color: 'rgba(240,213,138,0.88)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: COLORS.cream,
    fontWeight: '600',
  },
  dangerText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  buttonRow: {
    width: '100%',
  },
  buttonRowLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
