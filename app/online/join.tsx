import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, TextInput } from 'react-native';
import { showAlert } from '@/src/services/dialogs';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';
import { joinRoom } from '@/src/services/online';
import { requirePlayerName } from '@/src/store/nameGateStore';

export default function JoinRoomScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onJoin = async () => {
    if (code.trim().length < 4) {
      showAlert('Enter a room code');
      return;
    }
    setLoading(true);
    try {
      const name = await requirePlayerName();
      const result = await joinRoom(code, name);
      router.replace(`/game/${result.gameId}?code=${result.roomCode}`);
    } catch (e) {
      if (e instanceof Error && e.message === 'cancelled') return;
      showAlert(
        'Could not join',
        e instanceof Error ? e.message : 'Failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Join Room</Title>
      <Subtitle>Enter the 5-character code</Subtitle>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="BH7K9"
        placeholderTextColor={COLORS.muted}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
      />
      <AppButton
        title={loading ? 'Joining…' : 'Join'}
        disabled={loading}
        onPress={() => void onJoin()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(8,11,11,0.88)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    color: COLORS.gold,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    padding: 16,
    marginVertical: 24,
    fontWeight: '700',
  },
});
