import { router } from 'expo-router';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '@/src/components/ads/AdBanner';
import { WebHome } from '@/src/components/marketing/WebHome';
import { DeckOptionCard } from '@/src/components/ui/DeckOptionCard';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { APP_NAME, COLORS } from '@/src/constants/theme';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { playSfx } from '@/src/services/audio';
import { triggerHaptic } from '@/src/services/haptics';
import { useSettingsStore } from '@/src/store/settingsStore';
import {
  CATALOG_GAMES,
  type CatalogGameId,
  useGameCatalogStore,
} from '@/src/store/gameCatalogStore';

function TopIcon({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={async () => {
        await playSfx('click');
        await triggerHaptic('selection');
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      accessibilityLabel={label}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const displayName = useSettingsStore((s) => s.displayName);
  const setSelectedGame = useGameCatalogStore((s) => s.setSelectedGame);

  if (Platform.OS === 'web') {
    return <WebHome />;
  }

  const openGame = (id: CatalogGameId) => {
    setSelectedGame(id);
    router.push('/play');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#061510', '#04120E', '#030A08', '#020605']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          'rgba(18,100,70,0.18)',
          'transparent',
          'rgba(4,12,10,0.55)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View
        entering={FadeIn.duration(420)}
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 8),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.iconRow}>
          <TopIcon
            glyph="?"
            label="How to play"
            onPress={() => router.push('/rules')}
          />
          <TopIcon
            glyph="◈"
            label="Statistics"
            onPress={() => router.push('/stats')}
          />
          <TopIcon
            glyph="⚙"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        <Pressable
          onPress={async () => {
            await playSfx('click');
            await triggerHaptic('selection');
            router.push('/settings');
          }}
          style={({ pressed }) => [styles.youChip, pressed && styles.pressed]}
          accessibilityLabel="Profile"
        >
          <Image
            source={cachedAssetSource(GAME_ASSETS.playerFrame)}
            style={styles.youFrame}
            resizeMode="contain"
          />
          <Text style={styles.youName} numberOfLines={1}>
            {displayName.trim() || 'You'}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(480).easing(Easing.out(Easing.cubic))}
        style={[
          styles.heroTitleBlock,
          {
            paddingLeft: Math.max(insets.left, layout.pagePad),
            paddingRight: Math.max(insets.right, layout.pagePad),
          },
        ]}
      >
        <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
        <Text style={[styles.heroTitle, { fontSize: layout.titleSize + 8 }]}>
          {APP_NAME}
        </Text>
      </Animated.View>

      <View
        style={[
          styles.tabBarWrap,
          {
            paddingBottom: Math.max(insets.bottom, 10) + 4,
            paddingLeft: Math.max(insets.left, 14),
            paddingRight: Math.max(insets.right, 14),
          },
        ]}
      >
        <Animated.Text
          entering={FadeIn.delay(280).duration(360)}
          style={styles.sectionLabel}
        >
          Select game
        </Animated.Text>
        <View style={styles.cardRow}>
          {CATALOG_GAMES.map((g, i) => (
            <Animated.View
              key={g.id}
              entering={FadeInUp.delay(340 + i * 120)
                .duration(480)
                .easing(Easing.out(Easing.cubic))}
              style={styles.gameCardSlot}
            >
              <DeckOptionCard
                label={g.title}
                sub={g.blurb}
                glyph={g.glyph}
                peekCards={g.peekCards}
                primary={i === 0}
                prominent
                onPress={() => openGame(g.id)}
                style={styles.gameCard}
              />
            </Animated.View>
          ))}
        </View>
        <Animated.Text
          entering={FadeIn.delay(560).duration(360)}
          style={styles.disclaimer}
        >
          No gambling · No betting · No real money
        </Animated.Text>
        <AdBanner />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030A08',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,11,11,0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.65)',
  },
  iconGlyph: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 16,
    fontWeight: '700',
  },
  youChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 160,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(8,11,11,0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.65)',
  },
  youFrame: {
    width: 32,
    height: 32,
  },
  youName: {
    color: COLORS.cream,
    fontWeight: '800',
    fontSize: 13,
    flexShrink: 1,
  },
  heroTitleBlock: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  suits: {
    color: ART_DECO_PALETTE.goldLight,
    letterSpacing: 8,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  tabBarWrap: {
    flex: 1,
    zIndex: 3,
    marginTop: 6,
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  sectionLabel: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
    maxHeight: 210,
  },
  gameCardSlot: {
    flex: 1,
    minWidth: 0,
    maxWidth: '50%',
  },
  gameCard: {
    flex: 1,
    width: '100%',
    minHeight: 178,
  },
  disclaimer: {
    textAlign: 'center',
    color: 'rgba(138,154,148,0.85)',
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
});
