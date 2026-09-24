import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { DeckOptionCard } from '@/src/components/ui/DeckOptionCard';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import {
  CATALOG_GAMES,
  useGameCatalogStore,
} from '@/src/store/gameCatalogStore';

/**
 * After picking a game on home — choose how to play (shared for Thulla & Bluff).
 */
export default function PlayHubScreen() {
  const selectedGameId = useGameCatalogStore((s) => s.selectedGameId);
  const game =
    CATALOG_GAMES.find((g) => g.id === selectedGameId) ?? CATALOG_GAMES[0]!;

  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>{game.title}</Title>
      <Subtitle>{game.blurb}</Subtitle>

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Offline"
          sub="Pass & Play · AI"
          glyph="♠"
          image={GAME_ASSETS.table}
          primary
          onPress={() => router.push('/mode')}
        />
        <DeckOptionCard
          label="Online"
          sub="Create · Join"
          glyph="♦"
          image={GAME_ASSETS.environment}
          onPress={() => router.push('/online')}
        />
        <DeckOptionCard
          label="Quick Match"
          sub="Find 3 players"
          glyph="≫"
          image={GAME_ASSETS.thullaEffect}
          onPress={() => router.push('/online/match')}
        />
      </View>

      <Text style={styles.hint}>Same table · switch game anytime from Home</Text>
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
    maxWidth: 520,
    alignSelf: 'center',
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    color: 'rgba(138,154,148,0.9)',
    fontSize: 11,
  },
});
