import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';

/**
 * Legacy lobby route — private/online rooms now wait on the game table.
 * Redirect keeps old links working.
 */
export default function LobbyRedirectScreen() {
  const { code, gameId } = useLocalSearchParams<{
    code: string;
    gameId: string;
  }>();

  useEffect(() => {
    if (gameId) {
      router.replace(`/game/${gameId}?code=${code ?? ''}`);
      return;
    }
    router.replace('/online');
  }, [gameId, code]);

  return (
    <Screen showBack={false}>
      <View style={styles.wrap}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={styles.text}>Opening table…</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { color: COLORS.muted },
});
