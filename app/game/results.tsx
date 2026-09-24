import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GameBackground } from '@/src/components/table';
import { AppButton } from '@/src/components/ui/AppButton';
import { BackHeader } from '@/src/components/ui/BackHeader';
import { GAME_THEME } from '@/src/constants/gameTheme';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useGameStore } from '@/src/store/gameStore';

const { colors } = GAME_THEME;

function EscapeRow({
  name,
  place,
  delay,
  compact,
}: {
  name: string;
  place: number;
  delay: number;
  compact: boolean;
}) {
  const labels = ['1st', '2nd', '3rd', '4th'];
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380).springify().damping(16)}
      style={[styles.escapeRow, compact && styles.escapeRowCompact]}
    >
      <View style={[styles.placeBadge, compact && styles.placeBadgeCompact]}>
        <Text style={[styles.placeText, compact && { fontSize: 10 }]}>
          {labels[place] ?? `${place + 1}`}
        </Text>
      </View>
      <Text
        style={[styles.escapeName, compact && { fontSize: 14 }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={styles.escapeTag}>OUT</Text>
    </Animated.View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const state = useGameStore((s) => s.state);
  const clearGame = useGameStore((s) => s.clearGame);
  const thullaCount = useGameStore((s) => s.thullaCountThisGame);
  const pulse = useSharedValue(1);
  const compact = layout.landscape || layout.short < 400;
  const scale = layout.scale;

  useEffect(() => {
    pulse.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 900,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [pulse]);

  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const metrics = useMemo(() => {
    const padX =
      layout.pagePad + Math.max(insets.left, insets.right) * 0.5;
    return {
      padX,
      padTop: Math.max(insets.top, 6) + (compact ? 4 : 12),
      padBottom: Math.max(insets.bottom, 8) + 8,
      headline: Math.round((compact ? 22 : 28) * scale),
      panelMax: layout.landscape
        ? Math.min(680, layout.width - padX * 2)
        : Math.min(420, layout.width - padX * 2),
      crown: Math.round((compact ? 54 : 68) * scale),
      bhabhiName: Math.round((compact ? 18 : 22) * scale),
    };
  }, [compact, insets, layout, scale]);

  if (!state) {
    return (
      <GameBackground>
        <BackHeader onBack={() => router.replace('/')} />
        <View
          style={[
            styles.root,
            {
              paddingTop: 16,
              paddingHorizontal: metrics.padX,
            },
          ]}
        >
          <Text style={styles.headline}>No results</Text>
          <AppButton title="Home" onPress={() => router.replace('/')} />
        </View>
      </GameBackground>
    );
  }

  const escaped = [...state.players]
    .filter((p) => p.status === 'escaped')
    .sort((a, b) => {
      const ai = state.escapedOrder.indexOf(a.id);
      const bi = state.escapedOrder.indexOf(b.id);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  const bhabhi = state.players.find((p) => p.id === state.bhabhiId);

  const goAgain = () => {
    clearGame();
    router.replace('/mode');
  };

  const goHome = () => {
    clearGame();
    router.replace('/');
  };

  return (
    <GameBackground>
      <BackHeader
        onBack={() => {
          clearGame();
          router.replace('/');
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.root,
          {
            paddingTop: 6,
            paddingBottom: metrics.padBottom,
            paddingHorizontal: metrics.padX,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
          <Text style={[styles.eyebrow, compact && { fontSize: 9 }]}>
            BHABI THULLA
          </Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerGem}>◆</Text>
            <View style={styles.dividerLine} />
          </View>
          <Animated.Text
            entering={ZoomIn.delay(80).springify().damping(14)}
            style={[styles.headline, { fontSize: metrics.headline }]}
          >
            ROUND OVER
          </Animated.Text>
          <Text style={[styles.tagline, compact && { fontSize: 11 }]}>
            No prizes. Just glory — and shame for Bhabhi.
          </Text>
        </Animated.View>

        <View
          style={[
            styles.columns,
            { maxWidth: metrics.panelMax },
            layout.landscape && styles.columnsLandscape,
          ]}
        >
          <Animated.View
            entering={FadeInUp.delay(160).duration(420)}
            style={[styles.panel, layout.landscape && styles.panelHalf]}
          >
            <LinearGradient
              colors={[
                'rgba(200,155,60,0.16)',
                'rgba(7,61,50,0.5)',
                'rgba(8,9,9,0.88)',
              ]}
              style={[styles.panelInner, compact && styles.panelInnerCompact]}
            >
              <Text style={styles.panelTitle}>ESCAPED</Text>
              {escaped.length === 0 ? (
                <Text style={styles.emptyNote}>No one escaped</Text>
              ) : (
                escaped.map((p, i) => (
                  <EscapeRow
                    key={p.id}
                    name={p.name}
                    place={i}
                    delay={220 + i * 90}
                    compact={compact}
                  />
                ))
              )}
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(260).duration(420)}
            style={[styles.panel, layout.landscape && styles.panelHalf]}
          >
            <LinearGradient
              colors={[
                'rgba(232,93,76,0.18)',
                'rgba(40,20,12,0.82)',
                'rgba(8,9,9,0.92)',
              ]}
              style={[styles.panelInner, compact && styles.panelInnerCompact]}
            >
              <Text style={styles.panelTitle}>BHABHI</Text>
              {bhabhi ? (
                <View
                  style={[
                    styles.bhabhiBlock,
                    layout.landscape && styles.bhabhiBlockLandscape,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.crownRing,
                      {
                        width: metrics.crown,
                        height: metrics.crown,
                        borderRadius: metrics.crown / 2,
                      },
                      crownStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.crown,
                        { fontSize: Math.round(metrics.crown * 0.48) },
                      ]}
                    >
                      ♛
                    </Text>
                  </Animated.View>
                  <View style={styles.bhabhiCopy}>
                    <Text
                      style={[
                        styles.bhabhiName,
                        { fontSize: metrics.bhabhiName },
                      ]}
                      numberOfLines={1}
                    >
                      {bhabhi.name}
                    </Text>
                    <Text style={styles.bhabhiSub}>
                      Last one holding cards
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyNote}>—</Text>
              )}

              {thullaCount > 0 ? (
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    {thullaCount} Thulla{thullaCount === 1 ? '' : 's'} this
                    round
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(380).duration(400)}
          style={[
            styles.actions,
            layout.landscape && styles.actionsLandscape,
            { maxWidth: metrics.panelMax },
          ]}
        >
          <AppButton
            title="PLAY AGAIN"
            onPress={goAgain}
            style={styles.actionBtn}
          />
          <AppButton
            title="Home"
            variant="secondary"
            onPress={goHome}
            style={styles.actionBtn}
          />
        </Animated.View>
      </ScrollView>
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrow: {
    color: colors.goldMid,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    width: 160,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214,175,85,0.55)',
  },
  dividerGem: {
    color: colors.goldLight,
    fontSize: 8,
  },
  headline: {
    color: colors.ivory,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(247,241,227,0.55)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },
  columns: {
    width: '100%',
    gap: 10,
  },
  columnsLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  panel: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200,155,60,0.42)',
  },
  panelHalf: {
    flex: 1,
  },
  panelInner: {
    padding: 14,
    minHeight: 120,
  },
  panelInnerCompact: {
    padding: 10,
    minHeight: 96,
  },
  panelTitle: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  escapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(200,155,60,0.18)',
  },
  escapeRowCompact: {
    paddingVertical: 5,
  },
  placeBadge: {
    width: 34,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(200,155,60,0.22)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBadgeCompact: {
    width: 30,
    height: 22,
  },
  placeText: {
    color: colors.goldLight,
    fontWeight: '900',
    fontSize: 11,
  },
  escapeName: {
    flex: 1,
    color: colors.ivory,
    fontSize: 15,
    fontWeight: '700',
  },
  escapeTag: {
    color: '#3DDC97',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  emptyNote: {
    color: 'rgba(247,241,227,0.4)',
    fontSize: 13,
  },
  bhabhiBlock: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  bhabhiBlockLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  crownRing: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'rgba(232,93,76,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crown: {
    color: colors.goldLight,
  },
  bhabhiCopy: {
    alignItems: 'center',
  },
  bhabhiName: {
    color: '#FF8A7A',
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  bhabhiSub: {
    color: 'rgba(247,241,227,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  statChip: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(200,155,60,0.32)',
  },
  statChipText: {
    color: colors.goldMid,
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    marginTop: 14,
    gap: 4,
    alignItems: 'center',
  },
  actionsLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtn: {
    minWidth: 160,
  },
});
