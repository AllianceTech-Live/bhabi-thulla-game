import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { CARD_FACES } from '@/src/components/cards/cardFaces';
import { DeckOptionCard } from '@/src/components/ui/DeckOptionCard';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { requirePlayerName } from '@/src/store/nameGateStore';
import { isSupabaseConfigured } from '@/src/services/supabase';

/**
 * Online = public Quick Match (Ludo-style find players).
 */
export default function OnlineHomeScreen() {
  const ready = isSupabaseConfigured;

  const goMatch = async () => {
    try {
      await requirePlayerName();
      router.push('/online/match');
    } catch {
      /* cancelled */
    }
  };

  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Online</Title>
      <Subtitle>Find players · sit at the table · auto-starts</Subtitle>

      {!ready ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Supabase is not configured. Add your project URL and anon key in
            .env to enable online play.
          </Text>
        </View>
      ) : null}

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Quick Match"
          sub="Search online now"
          glyph="≫"
          image={GAME_ASSETS.thullaEffect}
          peekCards={[
            CARD_FACES.spades.A,
            CARD_FACES.hearts.K,
            CARD_FACES.diamonds.Q,
          ]}
          primary
          disabled={!ready}
          onPress={() => void goMatch()}
          style={styles.deckTile}
        />
      </View>

      <Text style={styles.hint}>
        You’ll be seated randomly with other players looking for a game.
      </Text>
      <Text
        style={styles.link}
        onPress={() => {
          void (async () => {
            try {
              await requirePlayerName();
              router.push('/online/private');
            } catch {
              /* cancelled */
            }
          })();
        }}
      >
        Prefer a private table with friends? →
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
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginTop: 18,
    maxWidth: 280,
    alignSelf: 'center',
  },
  deckTile: {
    flex: 1,
    minWidth: 0,
    width: '100%',
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
    maxWidth: 360,
    alignSelf: 'center',
    lineHeight: 18,
  },
  link: {
    textAlign: 'center',
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 12,
  },
  disclaimer: {
    textAlign: 'center',
    color: 'rgba(138,154,148,0.85)',
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 14,
  },
});
