import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { COLORS, MAX_PLAYERS, MIN_PLAYERS } from '@/src/constants/theme';
import type { AiDifficulty } from '@/src/game/types';
import { useGameStore } from '@/src/store/gameStore';
import { useBluffStore } from '@/src/store/bluffStore';
import { useGameCatalogStore } from '@/src/store/gameCatalogStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { savePlayerName } from '@/src/services/online';

export default function OfflineSetupScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAi = mode !== 'pass';
  const displayName = useSettingsStore((s) => s.displayName);
  const nameConfirmed = useSettingsStore((s) => s.nameConfirmed);
  const defaultDiff = useSettingsStore((s) => s.defaultAiDifficulty);
  const startOfflineGame = useGameStore((s) => s.startOfflineGame);
  const startOfflineBluff = useBluffStore((s) => s.startOfflineBluff);
  const selectedGameId = useGameCatalogStore((s) => s.selectedGameId);

  const [humanCount, setHumanCount] = useState(isAi ? 1 : 2);
  const [aiCount, setAiCount] = useState(isAi ? 3 : 0);
  const [difficulty, setDifficulty] = useState<AiDifficulty>(defaultDiff);
  const [name, setName] = useState(displayName);
  const savedName =
    (nameConfirmed || (displayName.trim() !== '' && displayName.trim() !== 'Player'))
      ? displayName.trim()
      : '';

  const total = humanCount + aiCount;
  const valid = total >= MIN_PLAYERS && total <= MAX_PLAYERS;

  const hint = useMemo(() => {
    if (total < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players`;
    if (total > MAX_PLAYERS) return `Maximum ${MAX_PLAYERS} players`;
    return `${total} players ready`;
  }, [total]);

  const start = () => {
    if (!valid) return;
    const playingAs = (savedName || name).trim() || 'Player';
    void savePlayerName(playingAs);
    const setup = {
      mode: (isAi ? 'offline_ai' : 'offline_pass_play') as
        | 'offline_ai'
        | 'offline_pass_play',
      humanCount,
      aiCount,
      aiDifficulty: difficulty,
      humanNames: Array.from({ length: humanCount }, (_, i) =>
        i === 0 ? playingAs : `Player ${i + 1}`
      ),
    };
    if (selectedGameId === 'bluff') {
      startOfflineBluff(setup);
      router.replace('/game/bluff-local');
      return;
    }
    startOfflineGame(setup);
    router.replace('/game/local');
  };

  return (
    <Screen>
      <Title>{isAi ? 'VS AI' : 'Pass & Play'}</Title>
      <Subtitle>{hint}</Subtitle>

      {savedName ? (
        <Text style={styles.savedName}>Playing as {savedName}</Text>
      ) : (
        <>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Player"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Humans: {humanCount}</Text>
        <View style={styles.stepper}>
          <AppButton
            title="−"
            variant="secondary"
            style={styles.step}
            onPress={() => setHumanCount((c) => Math.max(1, c - 1))}
          />
          <AppButton
            title="+"
            variant="secondary"
            style={styles.step}
            onPress={() =>
              setHumanCount((c) => Math.min(MAX_PLAYERS - aiCount, c + 1))
            }
          />
        </View>
      </View>

      {isAi && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>AI: {aiCount}</Text>
            <View style={styles.stepper}>
              <AppButton
                title="−"
                variant="secondary"
                style={styles.step}
                onPress={() => setAiCount((c) => Math.max(1, c - 1))}
              />
              <AppButton
                title="+"
                variant="secondary"
                style={styles.step}
                onPress={() =>
                  setAiCount((c) => Math.min(MAX_PLAYERS - humanCount, c + 1))
                }
              />
            </View>
          </View>

          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.diffRow}>
            {(['easy', 'medium', 'hard'] as AiDifficulty[]).map((d) => (
              <AppButton
                key={d}
                title={d.toUpperCase()}
                variant={difficulty === d ? 'primary' : 'secondary'}
                style={styles.diffBtn}
                onPress={() => setDifficulty(d)}
              />
            ))}
          </View>
        </>
      )}

      {!isAi && (
        <Text style={styles.note}>
          Hide hands between turns — pass the device when prompted.
        </Text>
      )}

      <AppButton
        title="START GAME"
        disabled={!valid}
        onPress={() => {
          Keyboard.dismiss();
          start();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.cream,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(8,11,11,0.88)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    color: COLORS.cream,
    padding: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepper: { flexDirection: 'row', gap: 6 },
  step: { paddingVertical: 4, paddingHorizontal: 12, minWidth: 36, minHeight: 32 },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: { flex: 1, paddingVertical: 6 },
  note: { color: COLORS.muted, marginVertical: 16, lineHeight: 20 },
  savedName: {
    color: COLORS.gold,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '800',
    fontSize: 16,
  },
});
