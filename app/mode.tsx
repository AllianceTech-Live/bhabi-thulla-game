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

export default function ModeScreen() {
  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>Offline</Title>
      <Subtitle>Pass & Play · AI opponents</Subtitle>

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Pass & Play"
          sub="Local table"
          glyph="Ⅳ"
          image={GAME_ASSETS.playerFrame}
          peekCards={[
            CARD_FACES.hearts['7'],
            CARD_FACES.spades['7'],
            CARD_FACES.diamonds['7'],
          ]}
          primary
          onPress={() =>
            router.push({
              pathname: '/offline/setup',
              params: { mode: 'pass' },
            })
          }
          style={styles.deckTile}
        />
        <DeckOptionCard
          label="Play vs AI"
          sub="Solo practice"
          glyph="♠A"
          image={GAME_ASSETS.cardBack}
          peekCards={[
            CARD_FACES.clubs.A,
            CARD_FACES.hearts.J,
            CARD_FACES.spades['10'],
          ]}
          onPress={() =>
            router.push({
              pathname: '/offline/setup',
              params: { mode: 'ai' },
            })
          }
          style={styles.deckTile}
        />
      </View>
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
    gap: 12,
    width: '100%',
    marginTop: 18,
    maxWidth: 420,
    alignSelf: 'center',
  },
  deckTile: {
    flex: 1,
    minWidth: 0,
    maxWidth: '50%',
  },
});
