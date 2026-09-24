import { StyleSheet, Text, View } from 'react-native';
import { Screen, Title } from '@/src/components/ui/AppButton';
import { PRIVACY_POLICY } from '@/src/constants/privacy';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';

export default function PrivacyScreen() {
  return (
    <Screen backTitle="Privacy">
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>{PRIVACY_POLICY.title}</Title>
      <Text style={styles.effective}>
        Effective {PRIVACY_POLICY.effectiveDate}
      </Text>
      <Text style={styles.intro}>{PRIVACY_POLICY.intro}</Text>
      {PRIVACY_POLICY.sections.map((s) => (
        <View key={s.heading} style={styles.card}>
          <Text style={styles.heading}>{s.heading}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}
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
    fontSize: 13,
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 4,
  },
  effective: {
    color: 'rgba(138,154,148,0.95)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  intro: {
    color: COLORS.cream,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
    opacity: 0.92,
  },
  card: {
    backgroundColor: 'rgba(8,14,14,0.88)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.45)',
  },
  heading: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 8,
  },
  body: {
    color: COLORS.cream,
    lineHeight: 22,
    fontSize: 14,
    opacity: 0.92,
  },
  disclaimer: {
    textAlign: 'center',
    color: 'rgba(138,154,148,0.9)',
    fontSize: 11,
    marginTop: 16,
    marginBottom: 16,
  },
});
