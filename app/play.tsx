import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  needsPlayerName,
  requirePlayerName,
} from '@/src/store/nameGateStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { isSupabaseConfigured } from '@/src/services/supabase';
import { playSfx } from '@/src/services/audio';

/**
 * After picking a game — Offline, Online (Quick Match), or Private Table.
 */
export default function PlayHubScreen() {
  const selectedGameId = useGameCatalogStore((s) => s.selectedGameId);
  const displayName = useSettingsStore((s) => s.displayName);
  const nameConfirmed = useSettingsStore((s) => s.nameConfirmed);
  const game =
    CATALOG_GAMES.find((g) => g.id === selectedGameId) ?? CATALOG_GAMES[0]!;
  const onlineReady = isSupabaseConfigured;

  // Ask for a name as soon as you land here (first time only).
  useEffect(() => {
    if (!needsPlayerName()) return;
    void requirePlayerName().catch(() => undefined);
  }, [nameConfirmed, displayName]);

  const go = async (path: '/mode' | '/online' | '/online/private') => {
    try {
      await requirePlayerName();
      router.push(path);
    } catch {
      /* cancelled name prompt */
    }
  };

  const onEditName = async () => {
    await playSfx('click');
    try {
      await requirePlayerName({ force: true });
    } catch {
      /* cancelled */
    }
  };

  return (
    <Screen centered>
      <Text style={styles.suits}>♠  ♥  ♦  ♣</Text>
      <Title>{game.title}</Title>
      <Subtitle>{game.blurb}</Subtitle>

      <Pressable onPress={() => void onEditName()} style={styles.nameRow}>
        <Text style={styles.nameText}>
          Playing as{' '}
          <Text style={styles.nameEm}>{displayName.trim() || 'Player'}</Text>
        </Text>
        <Text style={styles.nameEdit}>Change</Text>
      </Pressable>

      <View style={styles.cardRow}>
        <DeckOptionCard
          label="Offline"
          sub="Pass & Play · AI"
          glyph="♠"
          image={GAME_ASSETS.table}
          primary
          onPress={() => void go('/mode')}
        />
        <DeckOptionCard
          label="Online"
          sub="Quick Match"
          glyph="≫"
          image={GAME_ASSETS.thullaEffect}
          disabled={!onlineReady}
          onPress={() => void go('/online')}
        />
        <DeckOptionCard
          label="Private Table"
          sub="Create · Join"
          glyph="♦"
          image={GAME_ASSETS.environment}
          disabled={!onlineReady}
          onPress={() => void go('/online/private')}
        />
      </View>

      {!onlineReady ? (
        <Text style={styles.warn}>
          Online & Private Table need Supabase keys in .env
        </Text>
      ) : (
        <Text style={styles.hint}>
          Online finds players worldwide · Private is for friends with a code
        </Text>
      )}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  nameText: {
    color: 'rgba(247,241,227,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  nameEm: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '900',
  },
  nameEdit: {
    color: ART_DECO_PALETTE.gold,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
    marginTop: 14,
    maxWidth: 520,
    alignSelf: 'center',
  },
  warn: {
    textAlign: 'center',
    color: 'rgba(240,165,0,0.9)',
    fontSize: 12,
    marginTop: 16,
    maxWidth: 360,
    alignSelf: 'center',
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(247,241,227,0.72)',
    fontSize: 12,
    marginTop: 16,
    maxWidth: 380,
    alignSelf: 'center',
    lineHeight: 18,
  },
});
