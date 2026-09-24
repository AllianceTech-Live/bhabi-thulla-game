import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { leaveRoom, quickMatch } from '@/src/services/online';
import { playSfx } from '@/src/services/audio';
import { requirePlayerName } from '@/src/store/nameGateStore';

/**
 * Quick Match — find/create a public table, then enter the game room
 * immediately and wait on the felt (Ludo-style), not on this screen.
 */
export default function QuickMatchScreen() {
  const [status, setStatus] = useState('Finding a table…');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const seatedGameId = useRef<string | null>(null);

  const cancelAndLeave = useCallback(async () => {
    cancelled.current = true;
    const id = seatedGameId.current;
    seatedGameId.current = null;
    if (id) {
      try {
        await leaveRoom(id);
      } catch {
        // ignore
      }
    }
    router.replace('/online');
  }, []);

  const beginSearch = useCallback(async () => {
    setError(null);
    setStatus('Finding a table…');
    cancelled.current = false;
    seatedGameId.current = null;

    try {
      const name = await requirePlayerName();
      if (cancelled.current) return;
      const result = await quickMatch(name);
      if (cancelled.current) {
        await leaveRoom(result.gameId).catch(() => undefined);
        return;
      }
      seatedGameId.current = result.gameId;
      setStatus('Entering table…');
      void playSfx('click');
      router.replace(`/game/${result.gameId}?code=${result.roomCode}`);
    } catch (e) {
      if (cancelled.current) return;
      if (e instanceof Error && e.message === 'cancelled') {
        router.replace('/online');
        return;
      }
      setError(e instanceof Error ? e.message : 'Matchmaking failed');
    }
  }, []);

  useEffect(() => {
    void beginSearch();
    return () => {
      cancelled.current = true;
    };
  }, [beginSearch]);

  return (
    <Screen
      centered
      onBack={() => {
        void cancelAndLeave();
      }}
    >
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Quick Match</Title>
      <Subtitle>Opening your online table…</Subtitle>

      <View style={styles.card}>
        {!error ? (
          <>
            <ActivityIndicator color={ART_DECO_PALETTE.goldLight} size="large" />
            <Text style={styles.status}>{status}</Text>
            <Text style={styles.hint}>
              You’ll wait on the felt while players join
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.error}>{error}</Text>
            <AppButton title="Try again" onPress={() => void beginSearch()} />
          </>
        )}
      </View>

      <AppButton
        title="Cancel"
        variant="ghost"
        onPress={() => {
          void cancelAndLeave();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  suits: {
    color: ART_DECO_PALETTE.goldLight,
    letterSpacing: 8,
    fontSize: 14,
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 4,
  },
  card: {
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.55)',
    backgroundColor: 'rgba(4,12,10,0.88)',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(247,241,227,0.65)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  error: {
    color: COLORS.warning,
    textAlign: 'center',
    lineHeight: 20,
  },
});
