import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ART_DECO_PALETTE } from '../../constants/gameAssets';
import { GAME_THEME } from '../../constants/gameTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoomLayout } from '../../hooks/useRoomLayout';
import { triggerHaptic } from '../../services/haptics';
import { useSettingsStore } from '../../store/settingsStore';

/** Black + gold chrome chrome matching Asset #8 */
const chromeBorder = {
  backgroundColor: 'rgba(11,11,11,0.88)',
  borderWidth: 1.5,
  borderColor: ART_DECO_PALETTE.gold,
} as const;

type IconBtnProps = {
  label: string;
  onPress?: () => void;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ChromeIconButton({
  label,
  onPress,
  size = 40,
  active,
  style,
}: IconBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.iconBtnActive,
        style,
      ]}
      accessibilityLabel={label}
    >
      <Text style={styles.iconGlyph}>{glyphFor(label)}</Text>
    </Pressable>
  );
}

function glyphFor(label: string): string {
  switch (label.toLowerCase()) {
    case 'chat':
      return '💬';
    case 'emoji':
      return '☺';
    case 'voice':
      return '🎙';
    case 'settings':
      return '⚙';
    case 'hint':
      return '💡';
    case 'history':
      return '☰';
    case 'copy':
      return '⧉';
    case 'signal':
      return '▮▮▮';
    default:
      return '◆';
  }
}

type RoomCodeChipProps = {
  code?: string | null;
  latencyMs?: number | null;
  /** Offline table — signal reads Local instead of a ping. */
  offline?: boolean;
};

export function RoomCodeChip({
  code,
  latencyMs,
  offline,
}: RoomCodeChipProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = code?.trim() || (offline ? 'LOCAL' : 'ROOM');
  const bars =
    offline || latencyMs == null
      ? '▮▮▮'
      : latencyMs < 150
        ? '▮▮▮'
        : latencyMs < 350
          ? '▮▮'
          : '▮';

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copyCode = async () => {
    await Clipboard.setStringAsync(shown);
    setCopied(true);
    void triggerHaptic('selection');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <View style={styles.topCluster}>
      <Pressable onPress={() => void copyCode()} style={styles.roomCode}>
        <Text style={styles.roomLabel}>{copied ? 'Copied' : 'Room Code'}</Text>
        <Text style={styles.roomValue}>{shown}</Text>
        <Text style={styles.copyGlyph}>⧉</Text>
      </Pressable>
      <ChromeIconButton
        label="settings"
        size={36}
        onPress={() => {
          void triggerHaptic('selection');
          router.push('/settings');
        }}
      />
      <View style={styles.signal}>
        <Text style={styles.signalBars}>{bars}</Text>
        <Text style={styles.signalMs}>
          {offline ? 'Local' : latencyMs != null ? `${latencyMs}ms` : '…'}
        </Text>
      </View>
    </View>
  );
}

type SocialClusterProps = {
  onChat?: () => void;
  onEmoji?: () => void;
  onVoice?: () => void;
  chatActive?: boolean;
  emojiActive?: boolean;
};

const CHAT_LINES = [
  'Hello!',
  'Good luck!',
  'Nice move',
  'Well played',
  'Hurry up!',
  'Thanks!',
  'Oops!',
  'Haha',
  'Wow!',
  'Good game',
  'So close',
  'Your turn',
] as const;

const EMOJIS = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😎',
  '😍',
  '👍',
  '👏',
  '🙏',
  '🔥',
  '❤️',
  '😮',
  '😢',
  '🤔',
  '🎉',
  '💯',
] as const;

export function SocialCluster({
  onChat,
  onEmoji,
  onVoice,
  size = 40,
  gap = 8,
  chatActive,
  emojiActive,
}: SocialClusterProps & { size?: number; gap?: number }) {
  return (
    <View style={[styles.socialRow, { gap }]}>
      <ChromeIconButton
        label="chat"
        size={size}
        active={chatActive}
        onPress={onChat}
      />
      <ChromeIconButton
        label="emoji"
        size={size}
        active={emojiActive}
        onPress={onEmoji}
      />
      <ChromeIconButton label="voice" size={size} onPress={onVoice} />
    </View>
  );
}

export function ActionCluster({
  onAuto,
  active,
  size = 44,
}: {
  onAuto?: () => void;
  active?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onAuto}
      disabled={!onAuto}
      style={[
        styles.autoBtn,
        { width: size, height: size, borderRadius: Math.round(size * 0.22) },
        active && styles.autoBtnOn,
      ]}
      accessibilityLabel={active ? 'Rejoin and play yourself' : 'Auto play'}
      accessibilityState={{ selected: !!active }}
    >
      <Text style={[styles.autoText, active && styles.autoTextOn]}>
        {active ? 'Join' : 'Auto'}
      </Text>
    </Pressable>
  );
}

type SideUtilsProps = {
  onHint?: () => void;
};

export function SideUtils({ onHint, size = 44 }: SideUtilsProps & { size?: number }) {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  return (
    <View style={styles.sideCol}>
      <ChromeIconButton
        label="hint"
        size={size}
        active={!darkMode}
        onPress={() => {
          setDarkMode(!darkMode);
          onHint?.();
        }}
        style={{ borderRadius: Math.round(size * 0.22), width: size, height: size }}
      />
    </View>
  );
}

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact }: BrandMarkProps) {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandTitle}>BHABI THULLA</Text>
      {!compact && (
        <Text style={styles.brandTag}>PLAY · THINK · OUTLAST</Text>
      )}
    </View>
  );
}

/**
 * Asset #8 HUD shell — top-right system, bottom social/actions, mid-right utils.
 * Place absolutely over the game scene; does not own layout math.
 */
export function GameChrome({
  roomCode,
  latencyMs,
  offline,
  statusLine,
  yourTurn,
  onExit,
  onAuto,
  autoActive,
}: {
  roomCode?: string | null;
  latencyMs?: number | null;
  offline?: boolean;
  statusLine?: string;
  yourTurn?: boolean;
  onExit?: () => void;
  onAuto?: () => void;
  autoActive?: boolean;
}) {
  const room = useRoomLayout();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [panel, setPanel] = useState<'chat' | 'emoji' | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  const send = (text: string) => {
    setBubble(text);
    setPanel(null);
    void triggerHaptic('selection');
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3200);
  };

  const clusterLeft = room.edge + room.leftNudge;
  const clusterWidth = room.control * 3 + room.gap * 2;
  const panelLeft = clusterLeft + clusterWidth + room.gap;
  const panelWidth = Math.min(268, Math.max(180, screenW - panelLeft - room.control - room.edge * 4));

  return (
    <View style={styles.hud} pointerEvents="box-none">
      <View
        style={[
          styles.topBar,
          {
            paddingLeft: room.edge,
            paddingRight: Math.max(44, insets.right + 16),
            paddingTop: room.edge / 2,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => onExit?.()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Exit game"
          style={[styles.exitBtn, { marginLeft: room.leftNudge }]}
        >
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>

        <View style={styles.topCenter} pointerEvents="none">
          {autoActive ? (
            <View style={styles.autoHintPill}>
              <Text style={styles.autoHintText}>Auto · tap Join</Text>
            </View>
          ) : statusLine ? (
            <Text style={styles.statusHint} numberOfLines={1}>
              {statusLine}
            </Text>
          ) : yourTurn ? (
            <Text style={styles.statusHint}>YOUR TURN</Text>
          ) : null}
        </View>

        <RoomCodeChip code={roomCode} latencyMs={latencyMs} offline={offline} />
      </View>

      {panel ? (
        <Pressable style={styles.backdrop} onPress={() => setPanel(null)} />
      ) : null}

      {bubble ? (
        <View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              // Anchor above the local player profile (youTag).
              left: room.edge,
              bottom: room.youBottom + Math.round(room.control * 0.95),
            },
          ]}
        >
          <Text style={styles.bubbleText}>{bubble}</Text>
          <View style={styles.bubbleTail} />
        </View>
      ) : null}

      {panel ? (
        <View
          style={[
            styles.quickPanel,
            {
              left: panelLeft,
              bottom: room.edge,
              width: panelWidth,
            },
          ]}
        >
          <View style={styles.panelHead}>
            <Text style={styles.quickTitle}>
              {panel === 'chat' ? 'Quick chat' : 'Emoji'}
            </Text>
            <Pressable onPress={() => setPanel(null)} hitSlop={10} style={styles.panelCloseBtn}>
              <Text style={styles.panelClose}>✕</Text>
            </Pressable>
          </View>
          {panel === 'chat' ? (
            <View style={styles.chipWrap}>
              {CHAT_LINES.map((line) => (
                <Pressable
                  key={line}
                  onPress={() => send(line)}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                  <Text style={styles.chipText}>{line}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => send(emoji)}
                  style={({ pressed }) => [styles.emojiCell, pressed && styles.chipPressed]}
                >
                  <Text style={styles.emojiGlyph}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View
        style={[styles.bottomBar, { left: room.edge + room.leftNudge, bottom: room.edge, right: undefined }]}
        pointerEvents="box-none"
      >
        <SocialCluster
          size={room.control}
          gap={room.gap}
          chatActive={panel === 'chat'}
          emojiActive={panel === 'emoji'}
          onChat={() => setPanel((open) => (open === 'chat' ? null : 'chat'))}
          onEmoji={() => setPanel((open) => (open === 'emoji' ? null : 'emoji'))}
        />
      </View>

      <View
        style={[
          styles.sideMount,
          { right: room.edge, gap: room.gap, top: '28%' },
        ]}
        pointerEvents="box-none"
      >
        <SideUtils size={room.control} />
        <ActionCluster onAuto={onAuto} active={autoActive} size={room.control} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    ...StyleSheet.absoluteFill,
    zIndex: GAME_THEME.layers.gameControls,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 4,
    gap: 8,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 6,
  },
  autoHintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(214,175,85,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.55)',
  },
  autoHintText: {
    color: ART_DECO_PALETTE.goldLight,
    fontWeight: '700',
    fontSize: 11,
  },
  statusHint: {
    color: 'rgba(247,241,227,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideMount: {
    position: 'absolute',
    right: 10,
    top: '36%',
    alignItems: 'center',
    gap: 10,
  },
  exitBtn: {
    ...chromeBorder,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exitText: {
    color: ART_DECO_PALETTE.ivory,
    fontWeight: '700',
    fontSize: 12,
  },
  centerStatus: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  brand: { alignItems: 'center' },
  brandTitle: {
    color: ART_DECO_PALETTE.gold,
    fontFamily: 'Georgia',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 2,
  },
  brandTag: {
    color: 'rgba(247,241,227,0.55)',
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  turnPill: {
    backgroundColor: ART_DECO_PALETTE.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  turnPillText: {
    color: '#1A120C',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  statusMuted: {
    color: ART_DECO_PALETTE.goldMid,
    fontWeight: '700',
    fontSize: 11,
  },
  topCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  roomCode: {
    ...chromeBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomLabel: {
    color: 'rgba(247,241,227,0.5)',
    fontSize: 9,
    fontWeight: '600',
  },
  roomValue: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  copyGlyph: {
    color: ART_DECO_PALETTE.goldMid,
    fontSize: 11,
  },
  signal: {
    ...chromeBorder,
    flexShrink: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 52,
  },
  signalBars: {
    color: ART_DECO_PALETTE.online,
    fontSize: 9,
    letterSpacing: -1,
  },
  signalMs: {
    color: ART_DECO_PALETTE.ivory,
    fontSize: 8,
    fontWeight: '600',
  },
  iconBtn: {
    ...chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: ART_DECO_PALETTE.goldLight,
  },
  iconGlyph: {
    fontSize: 14,
    color: ART_DECO_PALETTE.gold,
  },
  socialRow: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    ...chromeBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pillText: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  playBtn: {
    backgroundColor: ART_DECO_PALETTE.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ART_DECO_PALETTE.goldLight,
  },
  playDisabled: {
    opacity: 0.4,
  },
  playText: {
    color: '#1A120C',
    fontWeight: '900',
    fontSize: 13,
    fontFamily: 'Georgia',
  },
  sideCol: {
    gap: 10,
    alignItems: 'center',
  },
  sideSquare: {
    borderRadius: 10,
    width: 44,
    height: 44,
  },
  autoBtn: {
    ...chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoBtnOn: {
    backgroundColor: ART_DECO_PALETTE.gold,
    borderColor: ART_DECO_PALETTE.goldLight,
  },
  autoText: {
    color: ART_DECO_PALETTE.gold,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  autoTextOn: {
    color: '#1A120C',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  quickPanel: {
    position: 'absolute',
    zIndex: 4,
    backgroundColor: 'rgba(8,10,10,0.96)',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.gold,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214,175,85,0.35)',
  },
  quickTitle: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  panelCloseBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.55)',
  },
  panelClose: {
    color: ART_DECO_PALETTE.goldLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: -1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.55)',
    backgroundColor: 'rgba(214,175,85,0.08)',
  },
  chipPressed: {
    backgroundColor: 'rgba(214,175,85,0.42)',
  },
  chipText: {
    color: ART_DECO_PALETTE.ivory,
    fontSize: 13,
    fontWeight: '700',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,175,85,0.5)',
    backgroundColor: 'rgba(214,175,85,0.08)',
  },
  emojiGlyph: {
    fontSize: 22,
  },
  bubble: {
    position: 'absolute',
    zIndex: 5,
    maxWidth: 180,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderWidth: 1.5,
    borderColor: ART_DECO_PALETTE.goldLight,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bubbleTail: {
    position: 'absolute',
    left: 18,
    bottom: -7,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(11,11,11,0.94)',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: ART_DECO_PALETTE.goldLight,
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: {
    color: ART_DECO_PALETTE.ivory,
    fontSize: 16,
    fontWeight: '800',
  },
});
