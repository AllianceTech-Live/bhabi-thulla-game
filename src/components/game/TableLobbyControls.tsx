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
  isHost: boolean;
  starting?: boolean;
  onStart: () => void;
  onLeave: () => void;
};

/**
 * Center overlay on the real game table — share code + Start (Ludo-style).
 */
export function TableLobbyControls({
  roomCode,
  playerCount,
  isHost,
  starting,
  onStart,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canStart = playerCount >= 2;

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

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.panel}>
        <Text style={styles.label}>Room code</Text>
        <Pressable onPress={() => void onCopy()}>
          <Text style={styles.code}>{roomCode || '—'}</Text>
          <Text style={styles.hint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
        </Pressable>
        <Text style={styles.count}>{playerCount}/4 at the table</Text>

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

        {isHost ? (
          <AppButton
            title={
              starting
                ? 'Starting…'
                : canStart
                  ? 'Start Game'
                  : 'Waiting for players…'
            }
            disabled={!canStart || starting}
            onPress={onStart}
          />
        ) : (
          <View style={styles.guest}>
            <ActivityIndicator color={ART_DECO_PALETTE.goldLight} />
            <Text style={styles.guestText}>Waiting for host to start…</Text>
          </View>
        )}

        <AppButton title="Leave" variant="ghost" onPress={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
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
