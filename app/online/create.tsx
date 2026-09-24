import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { showAlert } from '@/src/services/dialogs';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';
import { createRoom } from '@/src/services/online';
import { requirePlayerName } from '@/src/store/nameGateStore';
import { useSettingsStore } from '@/src/store/settingsStore';

export default function CreateRoomScreen() {
  const displayName = useSettingsStore((s) => s.displayName);
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    setLoading(true);
    try {
      const name = await requirePlayerName();
      const result = await createRoom(name);
      router.replace(`/game/${result.gameId}?code=${result.roomCode}`);
    } catch (e) {
      if (e instanceof Error && e.message === 'cancelled') return;
      showAlert(
        'Could not create room',
        e instanceof Error ? e.message : 'Failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Create Room</Title>
      <Subtitle>Share the code with friends (max 4)</Subtitle>
      <Text style={styles.name}>Playing as {displayName}</Text>
      <AppButton
        title={loading ? 'Creating…' : 'Create Private Room'}
        disabled={loading}
        onPress={() => void onCreate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: COLORS.muted, textAlign: 'center', marginBottom: 24 },
});
