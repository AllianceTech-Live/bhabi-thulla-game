import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { quickMatch } from '@/src/services/online';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { useSettingsStore } from '@/src/store/settingsStore';

/**
 * Quick Match — find other players who are searching and seat 4 at a table.
 */
export default function QuickMatchScreen() {
  const displayName = useSettingsStore((s) => s.displayName);
  const [status, setStatus] = useState('Looking for players…');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const search = useCallback(async () => {
    setError(null);
    setStatus('Looking for players…');
    cancelled.current = false;
    try {
      const result = await quickMatch(displayName || 'Player');
      if (cancelled.current) return;
      if (!result) {
        setError('Could not find a table. Try again.');
        return;
      }
      setStatus('Table found — opening…');
      router.replace(
        `/game/${result.gameId}?code=${result.roomCode}`
      );
    } catch (e) {
      if (cancelled.current) return;
      setError(e instanceof Error ? e.message : 'Matchmaking failed');
    }
  }, [displayName]);

  useEffect(() => {
    const t = setTimeout(() => {
      void search();
    }, 0);
    return () => {
      cancelled.current = true;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <Screen
      centered
      onBack={() => {
        cancelled.current = true;
        router.replace('/online');
      }}
    >
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Quick Match</Title>
      <Subtitle>Find 3 other players · 4 at a table</Subtitle>

      <View style={styles.heroCard}>
        <Image
          source={cachedAssetSource(GAME_ASSETS.thullaEffect)}
          style={styles.heroDeck}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            'rgba(4,12,10,0.25)',
            'rgba(4,12,10,0.55)',
            'rgba(4,12,10,0.94)',
          ]}
          locations={[0.15, 0.5, 1]}
          style={styles.heroFade}
        />
        <View style={styles.heroBody}>
          {!error ? (
            <>
              <ActivityIndicator color={ART_DECO_PALETTE.goldLight} size="large" />
              <Text style={styles.status}>{status}</Text>
              <Text style={styles.hint}>
                Playing as {displayName || 'Player'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.error}>{error}</Text>
              <AppButton title="Try again" onPress={() => void search()} />
            </>
          )}
        </View>
      </View>

      <AppButton
        title="Cancel"
        variant="ghost"
        onPress={() => {
          cancelled.current = true;
          router.replace('/online');
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
  heroCard: {
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    minHeight: 168,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: ART_DECO_PALETTE.goldLight,
    backgroundColor: ART_DECO_PALETTE.emeraldDark,
    shadowColor: ART_DECO_PALETTE.gold,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  heroDeck: {
    ...StyleSheet.absoluteFill,
  },
  heroFade: {
    ...StyleSheet.absoluteFill,
  },
  heroBody: {
    zIndex: 2,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  status: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hint: { color: 'rgba(247,241,227,0.72)', fontSize: 12 },
  error: {
    color: COLORS.warning,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
});
