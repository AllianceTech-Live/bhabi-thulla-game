import { useState } from 'react';
import { Image, Keyboard, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { showAlert } from '@/src/services/dialogs';
import {
  AppButton,
  Screen,
  Title,
} from '@/src/components/ui/AppButton';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { savePlayerName } from '@/src/services/online';
import { syncMusicFromSettings } from '@/src/services/audio';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { useSettingsStore } from '@/src/store/settingsStore';

function Row({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: COLORS.gold, false: COLORS.tableEdge }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const s = useSettingsStore();
  const [nameDraft, setNameDraft] = useState(s.displayName);
  const [saving, setSaving] = useState(false);
  const dirty = nameDraft.trim() !== s.displayName.trim();

  const onSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      showAlert('Name required', 'Enter a display name to save.');
      return;
    }
    setSaving(true);
    try {
      await savePlayerName(trimmed);
      setNameDraft(trimmed);
      Keyboard.dismiss();
      showAlert('Saved', `Playing as ${trimmed}`);
    } catch {
      showAlert('Could not save', 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Settings</Title>

      <Text style={styles.section}>Display name</Text>
      <View style={styles.nameCard}>
        <Image
          source={cachedAssetSource(GAME_ASSETS.cardBack)}
          style={styles.nameCardArt}
          resizeMode="cover"
        />
        <View style={styles.nameCardShade} />
        <View style={styles.nameCardBody}>
          <TextInput
            style={styles.input}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Your name"
            placeholderTextColor={COLORS.muted}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => void onSaveName()}
          />
          <AppButton
            title={saving ? 'Saving…' : 'Save name'}
            onPress={() => void onSaveName()}
            disabled={saving || !nameDraft.trim() || !dirty}
            style={styles.saveBtn}
          />
          <Text style={styles.savedAs}>
            Saved as: {s.displayName.trim() || '—'}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Preferences</Text>
      <Row
        label="Sound"
        value={s.soundEnabled}
        onValueChange={(v) => {
          s.setSoundEnabled(v);
          void syncMusicFromSettings();
        }}
      />
      <Row
        label="Music"
        value={s.musicEnabled}
        onValueChange={(v) => {
          s.setMusicEnabled(v);
          void syncMusicFromSettings();
        }}
      />
      <Row
        label="Haptics"
        value={s.hapticsEnabled}
        onValueChange={s.setHapticsEnabled}
      />
      <Row
        label="Card animations"
        value={s.cardAnimations}
        onValueChange={s.setCardAnimations}
      />
      <Row
        label="Dark mode"
        value={s.darkMode}
        onValueChange={s.setDarkMode}
      />

      <Text style={styles.section}>Language</Text>
      <View style={styles.langRow}>
        <AppButton
          title="English"
          variant={s.language === 'en' ? 'primary' : 'secondary'}
          style={styles.langBtn}
          onPress={() => s.setLanguage('en')}
        />
        <AppButton
          title="اردو (soon)"
          variant={s.language === 'ur' ? 'primary' : 'secondary'}
          style={styles.langBtn}
          onPress={() => s.setLanguage('ur')}
        />
      </View>

      <Text style={styles.note}>
        Architecture is ready for Urdu strings — translations can be added in
        src/i18n without changing game logic.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: COLORS.gold,
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '700',
  },
  nameCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    minHeight: 120,
  },
  nameCardArt: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  nameCardShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4,12,10,0.72)',
  },
  nameCardBody: {
    padding: 12,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.tableEdge,
  },
  label: { color: COLORS.cream, fontSize: 16 },
  input: {
    backgroundColor: 'rgba(8,11,11,0.88)',
    borderRadius: 12,
    color: COLORS.cream,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  saveBtn: { marginTop: 10 },
  savedAs: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
  },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  langBtn: { flex: 1 },
  note: {
    color: COLORS.muted,
    marginTop: 16,
    marginBottom: 24,
    fontSize: 12,
    lineHeight: 18,
  },
});
