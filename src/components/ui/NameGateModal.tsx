import { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { savePlayerName } from '@/src/services/online';
import { playSfx } from '@/src/services/audio';
import { triggerHaptic } from '@/src/services/haptics';
import { useNameGateStore } from '@/src/store/nameGateStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { AppButton } from './AppButton';

/**
 * One-time “what’s your name?” gate — Vert-style, asked once before play.
 * Uses a root overlay (not RN Modal) so it always shows on web.
 */
export function NameGateModal() {
  const visible = useNameGateStore((s) => s.visible);
  const force = useNameGateStore((s) => s.force);
  const complete = useNameGateStore((s) => s.complete);
  const cancel = useNameGateStore((s) => s.cancel);
  const saved = useSettingsStore((s) => s.displayName);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(saved.trim() && saved.trim().toLowerCase() !== 'player' ? saved.trim() : '');
      setError(null);
      setSaving(false);
    }
  }, [visible, saved]);

  if (!visible) return null;

  const onContinue = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters');
      return;
    }
    if (trimmed.length > 18) {
      setError('Keep it under 18 characters');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await playSfx('click');
      await triggerHaptic('light');
      await savePlayerName(trimmed);
      complete(trimmed);
    } catch {
      setError('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={styles.overlay}
      pointerEvents="auto"
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={force ? cancel : undefined}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.accentBar} />
          <Text style={styles.eyebrow}>
            {force ? 'Update your name' : 'Welcome to the table'}
          </Text>
          <Text style={styles.title}>What’s your name?</Text>
          <Text style={styles.hint}>
            {force
              ? 'This is how other players see you at the table.'
              : 'Asked once — this is how other players see you online.'}
          </Text>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              if (error) setError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoFocus={Platform.OS !== 'web'}
            maxLength={18}
            returnKeyType="done"
            autoCapitalize="words"
            autoCorrect={false}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              void onContinue();
            }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <AppButton
              title={force ? 'Cancel' : 'Not now'}
              variant="ghost"
              compact
              flex
              onPress={cancel}
            />
            <AppButton
              title={saving ? 'Saving…' : 'Continue'}
              compact
              flex
              disabled={saving}
              onPress={() => void onContinue()}
            />
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100000,
    elevation: 100000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 8, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(8, 18, 14, 0.98)',
    paddingHorizontal: 18,
    paddingTop: 18,
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
    backgroundColor: ART_DECO_PALETTE.gold,
  },
  eyebrow: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  title: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(247,241,227,0.7)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  input: {
    marginTop: 4,
    backgroundColor: 'rgba(4,10,8,0.9)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    color: COLORS.cream,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
