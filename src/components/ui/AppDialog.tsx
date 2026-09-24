import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { playSfx } from '@/src/services/audio';
import { triggerHaptic } from '@/src/services/haptics';
import { useDialogStore, type DialogButton } from '@/src/store/dialogStore';
import { AppButton } from './AppButton';

function toneAccent(tone: 'info' | 'error' | 'success') {
  if (tone === 'error') return COLORS.danger;
  if (tone === 'success') return COLORS.success;
  return ART_DECO_PALETTE.gold;
}

/**
 * In-app modal — replaces native window.alert / Alert on web & native.
 */
export function AppDialog() {
  const visible = useDialogStore((s) => s.visible);
  const title = useDialogStore((s) => s.title);
  const message = useDialogStore((s) => s.message);
  const tone = useDialogStore((s) => s.tone);
  const buttons = useDialogStore((s) => s.buttons);
  const close = useDialogStore((s) => s.close);

  const accent = toneAccent(tone);

  const onPressButton = async (btn: DialogButton) => {
    await playSfx('click');
    await triggerHaptic(btn.style === 'destructive' ? 'warning' : 'light');
    close();
    // Defer so the modal unmounts before navigation / state updates.
    requestAnimationFrame(() => btn.onPress?.());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <Text style={[styles.title, tone === 'error' && styles.titleError]}>
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {buttons.map((btn, i) => {
              const variant =
                btn.style === 'cancel'
                  ? 'ghost'
                  : btn.style === 'destructive'
                    ? 'danger'
                    : buttons.length > 1 && i === 0
                      ? 'secondary'
                      : 'primary';
              return (
                <AppButton
                  key={`${btn.text}-${i}`}
                  title={btn.text}
                  variant={variant}
                  compact
                  flex={buttons.length > 1}
                  onPress={() => void onPressButton(btn)}
                />
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(8, 18, 14, 0.96)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  title: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  titleError: {
    color: '#FFB4A8',
  },
  message: {
    color: 'rgba(247,241,227,0.82)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    justifyContent: 'center',
  },
});
