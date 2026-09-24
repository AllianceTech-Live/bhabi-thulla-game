import { router } from 'expo-router';
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      <ImageBackground
        source={cachedAssetSource(GAME_ASSETS.environment)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(4,21,16,0.35)',
            'rgba(4,21,16,0.15)',
            'rgba(4,21,16,0.72)',
            'rgba(4,12,10,0.92)',
          ]}
          locations={[0, 0.35, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View
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
      </View>

      <View
        style={[
          styles.hero,
          {
            paddingLeft: Math.max(insets.left, layout.pagePad),
            paddingRight: Math.max(insets.right, layout.pagePad),
          },
        ]}
      >
        <View style={styles.heroStage}>
          <Image
            source={cachedAssetSource(GAME_ASSETS.table)}
            style={styles.heroTable}
            resizeMode="contain"
          />
          <LinearGradient
            colors={['transparent', 'rgba(4,12,10,0.55)', 'rgba(4,12,10,0.92)']}
            style={styles.heroFade}
            pointerEvents="none"
          />
          <View style={styles.brandBlock} pointerEvents="none">
            <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
            <Text style={[styles.brand, { fontSize: layout.titleSize + 4 }]}>
              {APP_NAME}
            </Text>
            <Text style={styles.tagline}>Choose a game · same table · no stakes</Text>
          </View>
        </View>
      </View>

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
        <Text style={styles.sectionLabel}>Select game</Text>
        <View style={styles.cardRow}>
          {CATALOG_GAMES.map((g, i) => (
            <DeckOptionCard
              key={g.id}
              label={g.title}
              sub={g.blurb}
              glyph={g.glyph}
              image={g.image}
              primary={i === 0}
              onPress={() => openGame(g.id)}
              style={styles.gameCard}
            />
          ))}
        </View>
        <Text style={styles.disclaimer}>
          No gambling · No betting · No real money
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ART_DECO_PALETTE.room,
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
  hero: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
  heroStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroTable: {
    width: '92%',
    height: '78%',
    opacity: 0.95,
  },
  heroFade: {
    ...StyleSheet.absoluteFill,
  },
  brandBlock: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  suits: {
    color: ART_DECO_PALETTE.goldLight,
    letterSpacing: 8,
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 4,
  },
  brand: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    marginTop: 4,
    color: 'rgba(247,241,227,0.78)',
    fontSize: 12,
    textAlign: 'center',
  },
  tabBarWrap: {
    zIndex: 3,
  },
  sectionLabel: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  gameCard: {
    maxHeight: 168,
    minHeight: 128,
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
