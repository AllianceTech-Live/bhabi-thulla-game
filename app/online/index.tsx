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
import { isSupabaseConfigured } from '@/src/services/supabase';

export default function OnlineHomeScreen() {
  const ready = isSupabaseConfigured;

  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Online</Title>
      <Subtitle>Private rooms · Quick Match · Max 4</Subtitle>

      {!ready ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Supabase is not configured. Copy .env.example to .env and add your
            project URL and anon key to enable online play.
          </Text>
        </View>
      ) : null}

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Quick Match"
          sub="Find 3 players"
          glyph="≫"
          image={GAME_ASSETS.thullaEffect}
          primary
          disabled={!ready}
          onPress={() => router.push('/online/match')}
        />
        <DeckOptionCard
          label="Create"
          sub="Private room"
          glyph="✦"
          image={GAME_ASSETS.tableComposition}
          disabled={!ready}
          onPress={() => router.push('/online/create')}
        />
        <DeckOptionCard
          label="Join"
          sub="Enter code"
          glyph="◎"
          image={GAME_ASSETS.playerFrame}
          disabled={!ready}
          onPress={() => router.push('/online/join')}
        />
      </View>

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
    gap: 10,
    width: '100%',
    marginTop: 18,
    maxWidth: 480,
    alignSelf: 'center',
  },
  warn: {
    backgroundColor: 'rgba(58,42,16,0.88)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  warnText: { color: COLORS.cream, lineHeight: 20, fontSize: 13 },
  disclaimer: {
    textAlign: 'center',
    color: 'rgba(138,154,148,0.85)',
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 16,
  },
});
