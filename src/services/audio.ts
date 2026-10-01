import { Asset } from 'expo-asset';
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from 'expo-audio';
import { AppState, Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Table SFX: throw/land/pass use custom noise (no pitched chimes).
 * Other clips from HaelDB Cockatrice pack (CC0).
 * Shuffle clip is unchanged from the original pack.
 */
export type SfxName =
  | 'game_start'
  | 'shuffle'
  | 'card_deal'
  | 'card_select'
  | 'card_throw'
  | 'card_play'
  | 'tap'
  | 'untap'
  | 'error'
  | 'pass_turn'
  | 'stage'
  | 'thulla'
  | 'bluff'
  | 'win'
  | 'click'
  | 'dice';

const SOURCES: Record<SfxName, number> = {
  game_start: require('../../assets/sounds/game-start.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
  card_deal: require('../../assets/sounds/draw.wav'),
  /** Soft lift when a hand card is chosen. */
  card_select: require('../../assets/sounds/untap.wav'),
  /** Card leaves the hand — noise whoosh, not a chime. */
  card_throw: require('../../assets/sounds/card-throw-slap.wav'),
  /** Card lands on the felt — soft noise slap. */
  card_play: require('../../assets/sounds/card-land-slap.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  untap: require('../../assets/sounds/untap.wav'),
  error: require('../../assets/sounds/error.wav'),
  /** Soft dry tick when turn passes without a throw. */
  pass_turn: require('../../assets/sounds/turn-tick.wav'),
  stage: require('../../assets/sounds/stage.wav'),
  /** Spoken "Thulla!" shout on slam. */
  thulla: require('../../assets/sounds/thulla.wav'),
  /** Spoken "Bluff!" shout when a liar is caught. */
  bluff: require('../../assets/sounds/bluff.wav'),
  /** Escape / win fanfare. */
  win: require('../../assets/sounds/win-cheer.wav'),
  click: require('../../assets/sounds/tap.wav'),
  dice: require('../../assets/sounds/dice.wav'),
};

const MUSIC_SOURCE = require('../../assets/sounds/table-ambience.wav');
/** Quiet bed — sits under table SFX without fighting them. */
const MUSIC_VOLUME = 0.16;
/** Overlapping deal flicks need more than one player. */
const DEAL_POOL_SIZE = 4;
const SFX_VOLUME = 1;

const players: Partial<Record<SfxName, AudioPlayer>> = {};
let dealPool: AudioPlayer[] = [];
let dealPoolIndex = 0;
let musicPlayer: AudioPlayer | null = null;
let boot: Promise<void> | null = null;
let musicWanted = false;
let appStateBound = false;

/** Android ExoPlayer needs a local file URI; packager asset:// URLs often stay silent. */
async function resolveLocalUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('Audio asset missing URI');
  }
  return uri;
}

async function makePlayer(moduleId: number): Promise<AudioPlayer> {
  const uri = await resolveLocalUri(moduleId);
  return createAudioPlayer(
    { uri },
    {
      keepAudioSessionActive: true,
      updateInterval: 1000,
    }
  );
}

function clearDealPool() {
  dealPool.forEach((p) => {
    try {
      p.remove();
    } catch {
      // ignore
    }
  });
  dealPool = [];
  dealPoolIndex = 0;
}

async function applyAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  // Android: duckOthers requests audio focus so media routes to the speaker.
  // mixWithOthers skips focus and is often silent when another app holds the stream.
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: Platform.OS === 'android' ? 'duckOthers' : 'mixWithOthers',
  });
}

function bindAppStateOnce() {
  if (appStateBound) return;
  appStateBound = true;
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') return;
    void (async () => {
      try {
        await applyAudioMode();
      } catch {
        // ignore
      }
      if (musicWanted) {
        void playMusic(true);
      }
    })();
  });
}

export function initAudio(): Promise<void> {
  if (!boot) {
    boot = (async () => {
      bindAppStateOnce();
      try {
        await applyAudioMode();
      } catch {
        // Mode can fail on web / old clients — still try to create players.
      }
      try {
        const names = (Object.keys(SOURCES) as SfxName[]).filter((n) => n !== 'card_deal');
        await Promise.all(
          names.map(async (name) => {
            const existing = players[name];
            if (existing) {
              try {
                existing.remove();
              } catch {
                // Old player may already be gone.
              }
            }
            const p = await makePlayer(SOURCES[name]);
            p.volume = SFX_VOLUME;
            players[name] = p;
          })
        );
        clearDealPool();
        const dealPlayers = await Promise.all(
          Array.from({ length: DEAL_POOL_SIZE }, async () => {
            const p = await makePlayer(SOURCES.card_deal);
            p.volume = 0.95;
            return p;
          })
        );
        dealPool = dealPlayers;
        if (musicPlayer) {
          try {
            musicPlayer.remove();
          } catch {
            // ignore
          }
        }
        musicPlayer = await makePlayer(MUSIC_SOURCE);
        musicPlayer.loop = true;
        musicPlayer.volume = MUSIC_VOLUME;
      } catch {
        // Native audio can be missing on web or an old dev client.
      }
    })();
  }
  return boot;
}

/** Drop cached players so new wav files load after a reload. */
export function resetAudio(): void {
  (Object.keys(players) as SfxName[]).forEach((name) => {
    try {
      players[name]?.remove();
    } catch {
      // ignore
    }
    delete players[name];
  });
  clearDealPool();
  try {
    musicPlayer?.pause();
    musicPlayer?.remove();
  } catch {
    // ignore
  }
  musicPlayer = null;
  boot = null;
}

async function firePlayer(player: AudioPlayer): Promise<void> {
  try {
    if (!(player.volume > 0)) {
      player.volume = SFX_VOLUME;
    }
  } catch {
    // ignore
  }
  try {
    if (player.playing) {
      player.pause();
    }
  } catch {
    // ignore
  }
  try {
    await player.seekTo(0);
  } catch {
    // Not ready yet — still attempt play.
  }
  try {
    player.play();
  } catch {
    // Ignore a single failed playback.
  }
}

export async function playSfx(name: SfxName): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  await initAudio();
  try {
    if (name === 'card_deal') {
      if (dealPool.length === 0) return;
      const player = dealPool[dealPoolIndex % dealPool.length]!;
      dealPoolIndex = (dealPoolIndex + 1) % dealPool.length;
      void firePlayer(player);
      return;
    }
    let player = players[name];
    if (!player) {
      player = await makePlayer(SOURCES[name]);
      player.volume = SFX_VOLUME;
      players[name] = player;
    }
    await firePlayer(player);
  } catch {
    // Ignore a single failed playback.
  }
}

/** Soft looping table bed while a hand is in progress. */
export async function playMusic(enabled: boolean): Promise<void> {
  musicWanted = enabled;
  const { musicEnabled, soundEnabled } = useSettingsStore.getState();
  if (!enabled || !musicEnabled || !soundEnabled) {
    try {
      musicPlayer?.pause();
    } catch {
      // ignore
    }
    return;
  }
  await initAudio();
  if (!musicPlayer) return;
  try {
    musicPlayer.loop = true;
    musicPlayer.volume = MUSIC_VOLUME;
    if (!musicPlayer.playing) {
      musicPlayer.play();
    }
  } catch {
    // ignore
  }
}

export async function stopMusic(): Promise<void> {
  musicWanted = false;
  try {
    musicPlayer?.pause();
  } catch {
    // ignore
  }
}

/** Re-apply music after a settings toggle without leaving the table. */
export async function syncMusicFromSettings(): Promise<void> {
  await playMusic(musicWanted);
}
