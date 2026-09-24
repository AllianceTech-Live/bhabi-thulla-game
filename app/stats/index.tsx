import { Image, StyleSheet, Text, View } from 'react-native';
import {
  AppButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui/AppButton';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { COLORS } from '@/src/constants/theme';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { useStatsStore } from '@/src/store/statsStore';

export default function StatsScreen() {
  const stats = useStatsStore();

  const rows = [
    ['Games played', stats.gamesPlayed],
    ['Times escaped', stats.gamesEscaped],
    ['Times Bhabhi', stats.timesBhabhi],
    ['Thullas created', stats.thullasCreated],
    ['Offline escapes', stats.offlineWins],
  ] as const;

  return (
    <Screen>
      <Title>Statistics</Title>
      <Subtitle>Gameplay records only — no monetary value.</Subtitle>

      <View style={styles.heroCard}>
        <Image
          source={cachedAssetSource(GAME_ASSETS.cardBack)}
          style={styles.heroDeck}
          resizeMode="cover"
        />
        <View style={styles.heroShade} />
        <Text style={styles.heroLabel}>Your record</Text>
      </View>

      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>

      <AppButton
        title="Reset stats"
        variant="danger"
        onPress={stats.resetStats}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    justifyContent: 'flex-end',
  },
  heroDeck: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4,12,10,0.45)',
  },
  heroLabel: {
    zIndex: 1,
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: 'rgba(8,11,11,0.82)',
    borderRadius: 16,
    padding: 8,
    marginVertical: 16,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.tableEdge,
  },
  label: { color: COLORS.cream },
  value: { color: COLORS.gold, fontWeight: '700', fontSize: 16 },
});
