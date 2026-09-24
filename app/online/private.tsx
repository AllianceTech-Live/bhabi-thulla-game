import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { DeckOptionCard } from '@/src/components/ui/DeckOptionCard';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { requirePlayerName } from '@/src/store/nameGateStore';
import { isSupabaseConfigured } from '@/src/services/supabase';

/**
 * Private Table — invite friends with a room code (Create or Join).
 */
export default function PrivateTableScreen() {
  const ready = isSupabaseConfigured;

  const go = async (path: '/online/create' | '/online/join') => {
    try {
      await requirePlayerName();
      router.push(path);
    } catch {
      /* cancelled */
    }
  };

  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Private Table</Title>
      <Subtitle>Play with friends · room code · max 4</Subtitle>

      {!ready ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Supabase is not configured. Add your project URL and anon key in
            .env to enable private rooms.
          </Text>
        </View>
      ) : null}

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Create Room"
          sub="Get a code to share"
          glyph="✦"
          image={GAME_ASSETS.tableComposition}
          primary
          disabled={!ready}
          onPress={() => void go('/online/create')}
        />
        <DeckOptionCard
          label="Join Room"
          sub="Enter a friend’s code"
          glyph="◎"
          image={GAME_ASSETS.playerFrame}
          disabled={!ready}
          onPress={() => void go('/online/join')}
        />
      </View>

      <Text style={styles.hint}>
        Game starts automatically when enough players are seated — no host
        needed.
      </Text>
      <Text style={styles.disclaimer}>
        No gambling · No betting · No real money
      </Text>
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    width: '100%',
    marginTop: 18,
    maxWidth: 420,
    alignSelf: 'center',
  },
  warn: {
    backgroundColor: 'rgba(58,42,16,0.88)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  warnText: { color: COLORS.cream, lineHeight: 20, fontSize: 13 },
  hint: {
    textAlign: 'center',
    color: 'rgba(247,241,227,0.72)',
    fontSize: 12,
    marginTop: 16,
    maxWidth: 380,
    alignSelf: 'center',
    lineHeight: 18,
  },
  disclaimer: {
    textAlign: 'center',
    color: 'rgba(138,154,148,0.85)',
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 12,
  },
});
