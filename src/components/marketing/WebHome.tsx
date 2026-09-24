import { router } from 'expo-router';
import { useRef } from 'react';
import {
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckOptionCard } from '@/src/components/ui/DeckOptionCard';
import { GAME_ASSETS, ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { MARKETING } from '@/src/constants/marketing';
import { COLORS } from '@/src/constants/theme';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { cachedAssetSource } from '@/src/services/preloadAssets';
import { playSfx } from '@/src/services/audio';
import { triggerHaptic } from '@/src/services/haptics';
import { requirePlayerName } from '@/src/store/nameGateStore';
import {
  CATALOG_GAMES,
  type CatalogGameId,
  useGameCatalogStore,
} from '@/src/store/gameCatalogStore';

/**
 * Web home: premium, friendly marketing landing + same-asset game picker.
 */
export function WebHome() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const scrollRef = useRef<ScrollView>(null);
  const playY = useRef(0);
  const setSelectedGame = useGameCatalogStore((s) => s.setSelectedGame);

  const openGame = async (id: CatalogGameId) => {
    setSelectedGame(id);
    try {
      await requirePlayerName();
      router.push('/play');
    } catch {
      /* cancelled name prompt — stay on home */
    }
  };

  const scrollToPlay = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, playY.current - 24),
      animated: true,
    });
  };

  const openAppStore = async () => {
    await playSfx('click');
    await triggerHaptic('selection');
    void Linking.openURL(MARKETING.appStoreUrl);
  };

  const onPlaySectionLayout = (e: LayoutChangeEvent) => {
    playY.current = e.nativeEvent.layout.y;
  };

  const padX = Math.max(insets.left, layout.pagePad, 24);
  const padR = Math.max(insets.right, layout.pagePad, 24);
  const brandSize = Math.min(layout.titleSize + 22, 56);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={cachedAssetSource(GAME_ASSETS.environment)}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(6,24,20,0.55)',
            'rgba(6,18,16,0.25)',
            'rgba(5,14,12,0.78)',
            'rgba(4,10,9,0.96)',
          ]}
          locations={[0, 0.32, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 40),
            paddingLeft: padX,
            paddingRight: padR,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={styles.nav}>
          <View style={styles.navBrandWrap}>
            <View style={styles.navGem} />
            <Text style={styles.navBrand}>{MARKETING.productName}</Text>
          </View>
          <View style={styles.navActions}>
            <Pressable
              onPress={() => {
                void playSfx('click');
                router.push('/rules');
              }}
              style={({ pressed }) => [styles.navLink, pressed && styles.pressed]}
            >
              <Text style={styles.navLinkText}>How to play</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void playSfx('click');
                router.push('/privacy');
              }}
              style={({ pressed }) => [styles.navLink, pressed && styles.pressed]}
            >
              <Text style={styles.navLinkText}>Privacy</Text>
            </Pressable>
            <Pressable
              onPress={() => void openAppStore()}
              style={({ pressed }) => [styles.storeChip, pressed && styles.pressed]}
            >
              <Text style={styles.storeChipText}>App Store</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroShell}>
          <LinearGradient
            colors={[
              'rgba(214,175,85,0.14)',
              'rgba(7,61,50,0.35)',
              'rgba(6,12,12,0.82)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          />
          <View style={styles.hero}>
            <View style={styles.heroVisual}>
              <Image
                source={cachedAssetSource(GAME_ASSETS.table)}
                style={styles.heroTable}
                resizeMode="contain"
                accessibilityLabel="Art Deco card table"
              />
              <Image
                source={cachedAssetSource(GAME_ASSETS.cardBack)}
                style={styles.heroCardA}
                resizeMode="contain"
              />
              <Image
                source={cachedAssetSource(GAME_ASSETS.cardBack)}
                style={styles.heroCardB}
                resizeMode="contain"
              />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.welcome}>{MARKETING.welcome}</Text>
              <View style={styles.goldRule} />
              <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
              <Text style={[styles.brand, { fontSize: brandSize }]}>
                {MARKETING.productName}
              </Text>
              <Text style={styles.headline}>{MARKETING.headline}</Text>
              <Text style={styles.subhead}>{MARKETING.subhead}</Text>

              <View style={styles.ctaRow}>
                <Pressable
                  onPress={async () => {
                    await playSfx('click');
                    await triggerHaptic('selection');
                    scrollToPlay();
                  }}
                  style={({ pressed }) => [
                    styles.ctaPrimary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.ctaPrimaryText}>Play free now</Text>
                </Pressable>
                <Pressable
                  onPress={() => void openAppStore()}
                  style={({ pressed }) => [
                    styles.ctaSecondary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.ctaSecondaryText}>Get the iOS app</Text>
                </Pressable>
              </View>
              <Text style={styles.disclaimer}>{MARKETING.disclaimer}</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featureRow}>
          {MARKETING.features.map((f) => (
            <View key={f.title} style={styles.feature}>
              <LinearGradient
                colors={['rgba(214,175,85,0.16)', 'rgba(8,14,14,0.92)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.featureGlyph}>{f.glyph}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          ))}
        </View>

        {/* Play */}
        <View onLayout={onPlaySectionLayout} style={styles.playPanel}>
          <LinearGradient
            colors={['rgba(7,61,50,0.45)', 'rgba(6,12,12,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.sectionLabel}>Choose a game</Text>
          <Text style={styles.sectionHint}>
            Same table, cards, and rules as the iOS app — tap to start
          </Text>
          <View style={styles.cardRow}>
            {CATALOG_GAMES.map((g, i) => (
              <DeckOptionCard
                key={g.id}
                label={g.title}
                sub={g.blurb}
                glyph={g.glyph}
                image={g.image}
                primary={i === 0}
                onPress={() => void openGame(g.id)}
                style={styles.gameCard}
              />
            ))}
          </View>
        </View>

        {/* SEO / about */}
        <View style={styles.seoBlock}>
          <Text style={styles.sectionLabel}>Good to know</Text>
          {MARKETING.seoSections.map((section) => (
            <View key={section.heading} style={styles.seoItem}>
              <Text style={styles.seoHeading}>{section.heading}</Text>
              <Text style={styles.seoBody}>{section.body}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.goldRuleWide} />
          <Text style={styles.footerText}>{MARKETING.footerLine}</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => router.push('/rules')}>
              <Text style={styles.footerLink}>Rules</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable onPress={() => router.push('/privacy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable onPress={() => void openAppStore()}>
              <Text style={styles.footerLink}>App Store</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ART_DECO_PALETTE.room,
  },
  scroll: { flex: 1 },
  scrollContent: {
    gap: 32,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  navBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navGem: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: ART_DECO_PALETTE.gold,
    transform: [{ rotate: '45deg' }],
  },
  navBrand: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.8,
    fontFamily: 'Georgia',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  navLinkText: {
    color: 'rgba(247,241,227,0.88)',
    fontWeight: '600',
    fontSize: 13,
  },
  storeChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.75)',
    backgroundColor: 'rgba(8,14,14,0.78)',
  },
  storeChipText: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 12,
  },
  heroShell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.28)',
    backgroundColor: 'rgba(4,12,10,0.55)',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    padding: 22,
  },
  heroVisual: {
    flexGrow: 1,
    flexBasis: 300,
    minHeight: 240,
    maxHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTable: {
    width: '100%',
    height: '100%',
    opacity: 0.98,
  },
  heroCardA: {
    position: 'absolute',
    width: 70,
    height: 98,
    right: '10%',
    bottom: '16%',
    transform: [{ rotate: '14deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  heroCardB: {
    position: 'absolute',
    width: 58,
    height: 82,
    left: '8%',
    bottom: '22%',
    transform: [{ rotate: '-18deg' }],
    opacity: 0.92,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  heroCopy: {
    flexGrow: 1,
    flexBasis: 300,
    maxWidth: 500,
    gap: 6,
  },
  welcome: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.95,
  },
  goldRule: {
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: ART_DECO_PALETTE.gold,
    marginVertical: 6,
    opacity: 0.85,
  },
  goldRuleWide: {
    width: 72,
    height: 2,
    borderRadius: 1,
    backgroundColor: ART_DECO_PALETTE.gold,
    marginBottom: 12,
    opacity: 0.7,
    alignSelf: 'center',
  },
  suits: {
    color: ART_DECO_PALETTE.goldLight,
    letterSpacing: 10,
    fontSize: 15,
    opacity: 0.9,
  },
  brand: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontFamily: 'Georgia',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  headline: {
    color: COLORS.cream,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginTop: 6,
    fontFamily: 'Georgia',
  },
  subhead: {
    color: 'rgba(247,241,227,0.82)',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  ctaPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: ART_DECO_PALETTE.gold,
    shadowColor: ART_DECO_PALETTE.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaPrimaryText: {
    color: ART_DECO_PALETTE.emeraldDark,
    fontWeight: '900',
    fontSize: 15,
  },
  ctaSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(214,175,85,0.7)',
    backgroundColor: 'rgba(8,14,14,0.65)',
  },
  ctaSecondaryText: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 15,
  },
  disclaimer: {
    marginTop: 12,
    color: 'rgba(168,180,174,0.95)',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  feature: {
    flexGrow: 1,
    flexBasis: 200,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.4)',
    overflow: 'hidden',
    gap: 6,
    minHeight: 132,
  },
  featureGlyph: {
    color: ART_DECO_PALETTE.gold,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
    fontSize: 16,
    fontFamily: 'Georgia',
  },
  featureBody: {
    color: 'rgba(247,241,227,0.8)',
    fontSize: 13,
    lineHeight: 19,
  },
  playPanel: {
    gap: 10,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.35)',
    overflow: 'hidden',
  },
  sectionLabel: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: 'rgba(247,241,227,0.7)',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 14,
  },
  gameCard: {
    flexGrow: 1,
    flexBasis: 220,
    maxWidth: 340,
    minHeight: 150,
    maxHeight: 190,
  },
  seoBlock: {
    gap: 12,
  },
  seoItem: {
    gap: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.22)',
    backgroundColor: 'rgba(8,14,14,0.62)',
  },
  seoHeading: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: 'Georgia',
  },
  seoBody: {
    color: 'rgba(247,241,227,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  footerText: {
    color: 'rgba(168,180,174,0.95)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 420,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 13,
  },
  footerDot: {
    color: 'rgba(214,175,85,0.45)',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
