import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppButton } from '@/src/components/ui/AppButton';
import { ART_DECO_PALETTE } from '@/src/constants/gameAssets';
import { APP_NAME, COLORS } from '@/src/constants/theme';
import { playSfx } from '@/src/services/audio';
import { triggerHaptic } from '@/src/services/haptics';

type Props = {
  roomCode: string;
  playerCount: number;
  starting?: boolean;
  /** Seconds until full-table auto-deal (null = not counting) */
  autoStartInSec?: number | null;
  /** Quick Match: hide share code, show online search messaging */
  quickMatch?: boolean;
  onLeave: () => void;
};

/**
 * Center overlay on the real game table — wait for 4, then auto-deal.
 */
export function TableLobbyControls({
  roomCode,
  playerCount,
  starting,
  autoStartInSec = null,
  quickMatch = false,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counting =
    autoStartInSec != null && autoStartInSec > 0 && !starting;

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const shareMessage = `Join my ${APP_NAME} table!\nRoom code: ${roomCode}\nOpen Online → Join Room and enter the code.`;

  const onCopy = async () => {
    await Clipboard.setStringAsync(roomCode);
    await playSfx('click');
    await triggerHaptic('selection');
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1400);
  };

  const onShare = async () => {
    try {
      await playSfx('click');
      await Share.share({
        message: shareMessage,
        title: `${APP_NAME} room ${roomCode}`,
      });
    } catch {
      /* dismissed */
    }
  };

  const statusText = (() => {
    if (starting) return 'Starting game…';
    if (counting) {
      if (playerCount >= 4) {
        return `Table full — starts in ${autoStartInSec}s`;
      }
      return `Starts in ${autoStartInSec}s with ${playerCount} player${playerCount === 1 ? '' : 's'}`;
    }
    if (playerCount >= 4) return 'Table full — dealing…';
    if (playerCount >= 2) return `Waiting — auto-starts in 10s once ready`;
    return 'Waiting for players…';
  })();

  const statusBlock = (
    <View style={styles.guest}>
      <ActivityIndicator color={ART_DECO_PALETTE.goldLight} />
      <Text style={styles.guestText}>{statusText}</Text>
    </View>
  );

  if (quickMatch) {
    return (
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.panel}>
          <Text style={styles.label}>Online table</Text>
          <Text style={styles.quickTitle}>
            {playerCount >= 4
              ? 'Table full'
              : playerCount >= 2
                ? 'Almost ready'
                : 'Waiting for players…'}
          </Text>
          <Text style={styles.count}>{playerCount}/4 seated</Text>
          <Text style={styles.hint}>
            After 2 players join, the game auto-starts in 10 seconds with
            whoever is seated (2, 3, or 4).
          </Text>
          {statusBlock}
          <AppButton title="Leave table" variant="ghost" onPress={onLeave} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.panel}>
        <Text style={styles.label}>Room code</Text>
        <Pressable onPress={() => void onCopy()}>
          <Text style={styles.code}>{roomCode || '—'}</Text>
          <Text style={styles.hint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
        </Pressable>
        <Text style={styles.count}>{playerCount}/4 at the table</Text>
        <Text style={styles.hint}>
          After 2 join, auto-starts in 10s with 2, 3, or 4 players.
        </Text>

        <View style={styles.row}>
          <AppButton
            title={copied ? 'Copied' : 'Copy'}
            variant="secondary"
            flex
            glyph="⧉"
            compact
            onPress={() => void onCopy()}
          />
          <AppButton
            title="Share"
            variant="secondary"
            flex
            glyph="↗"
            compact
            onPress={() => void onShare()}
          />
        </View>

        {statusBlock}

        <AppButton title="Leave" variant="ghost" onPress={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  panel: {
    width: '72%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    backgroundColor: 'rgba(4,12,10,0.88)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    alignItems: 'stretch',
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  quickTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  code: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(247,241,227,0.55)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  count: {
    color: 'rgba(247,241,227,0.75)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 8 },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  guestText: {
    color: COLORS.cream,
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
});
