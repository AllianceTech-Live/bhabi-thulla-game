import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { playSfx } from '../../services/audio';
import { lockLandscapeOrientation } from '../../services/orientation';
import { triggerHaptic } from '../../services/haptics';

interface BackHeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  visible?: boolean;
  /** When true, skip top safe-area (parent already padded). */
  embedded?: boolean;
}

export function BackHeader({
  title,
  onBack,
  right,
  visible = true,
  embedded = false,
}: BackHeaderProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();

  if (!visible) return null;

  const handleBack = async () => {
    await playSfx('click');
    await triggerHaptic('selection');
    await lockLandscapeOrientation();
    if (onBack) {
      onBack();
      setTimeout(() => void lockLandscapeOrientation(), 80);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
    setTimeout(() => void lockLandscapeOrientation(), 80);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: embedded ? 0 : Math.max(insets.top, 4),
          paddingLeft: Math.max(6, insets.left),
          paddingRight: Math.max(6, insets.right),
          minHeight: layout.landscape ? 36 : 44,
        },
      ]}
    >
      <Pressable
        onPress={() => void handleBack()}
        hitSlop={12}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.chevron}>‹</Text>
      </Pressable>

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpacer} />
      )}

      <View style={styles.right}>
        {right ?? <View style={styles.rightSpacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    zIndex: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,11,11,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.65)',
  },
  pressed: {
    opacity: 0.75,
  },
  chevron: {
    color: COLORS.goldSoft,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -2,
    marginLeft: -1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.goldSoft,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  titleSpacer: {
    flex: 1,
  },
  right: {
    width: 36,
    alignItems: 'flex-end',
  },
  rightSpacer: {
    width: 36,
  },
});
