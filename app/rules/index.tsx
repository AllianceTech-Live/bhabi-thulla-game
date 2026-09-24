import { StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Title,
} from '@/src/components/ui/AppButton';
import { COLORS } from '@/src/constants/theme';

const RULES = [
  {
    title: '1. The Deck',
    body: 'Standard 52-card deck. No jokers. Ace is highest.',
  },
  {
    title: '2. Players',
    body: '2–4 players. Everyone plays alone — no teams. Default is 4.',
  },
  {
    title: '3. Opening',
    body: 'Whoever holds the Ace of Spades (♠A) starts, and must play it first.',
  },
  {
    title: '4. Follow Suit',
    body: 'The first card of a trick sets the lead suit. If you have that suit, you must play it.',
  },
  {
    title: '5. Thulla',
    body: 'If you have no cards of the lead suit, play any other card — that is a Thulla. The trick ends immediately.',
  },
  {
    title: '6. Who takes the pile?',
    body: 'On a Thulla, the highest lead-suit card’s player takes the whole pile into their hand and leads next. Example: ♥5, ♥K, ♣A → player with ♥K takes all three.',
  },
  {
    title: '7. Clean trick',
    body: 'If everyone follows suit, the highest lead-suit card wins. Those cards leave the game. Winner leads next.',
  },
  {
    title: '8. Escaping',
    body: 'Empty your hand to escape. Escaped players sit out future tricks.',
  },
  {
    title: '9. Bhabhi',
    body: 'The last player still holding cards is Bhabhi — they lose the round. No money, no betting, just bragging rights.',
  },
];

export default function RulesScreen() {
  return (
    <Screen>
      <Title>How to Play</Title>
      {RULES.map((r) => (
        <View key={r.title} style={styles.card}>
          <Text style={styles.heading}>{r.title}</Text>
          <Text style={styles.body}>{r.body}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8,11,11,0.82)',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  heading: {
    color: COLORS.gold,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  body: {
    color: COLORS.cream,
    lineHeight: 22,
    fontSize: 14,
  },
});
