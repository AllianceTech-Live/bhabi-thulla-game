import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
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
  /** Spoken "Thulla!" shout (Lahore 3 take) on slam. */
  thulla: require('../../assets/sounds/thulla.wav'),
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

const players: Partial<Record<SfxName, AudioPlayer>> = {};
let dealPool: AudioPlayer[] = [];
let dealPoolIndex = 0;
let musicPlayer: AudioPlayer | null = null;
let boot: Promise<void> | null = null;
let musicWanted = false;

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

export function initAudio(): Promise<void> {
  if (!boot) {
    boot = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
        });
        (Object.keys(SOURCES) as SfxName[]).forEach((name) => {
          if (name === 'card_deal') return;
          const existing = players[name];
          if (existing) {
            try {
              existing.remove();
            } catch {
              // Old player may already be gone.
            }
          }
          players[name] = createAudioPlayer(SOURCES[name]);
        });
        clearDealPool();
        for (let i = 0; i < DEAL_POOL_SIZE; i++) {
          const p = createAudioPlayer(SOURCES.card_deal);
          p.volume = 0.95;
          dealPool.push(p);
        }
        if (musicPlayer) {
          try {
            musicPlayer.remove();
          } catch {
            // ignore
          }
        }
        musicPlayer = createAudioPlayer(MUSIC_SOURCE);
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

export async function playSfx(name: SfxName): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  await initAudio();
  try {
    if (name === 'card_deal') {
      if (dealPool.length === 0) return;
      const player = dealPool[dealPoolIndex % dealPool.length]!;
      dealPoolIndex = (dealPoolIndex + 1) % dealPool.length;
      void player.seekTo(0).then(() => {
        try {
          player.play();
        } catch {
          // ignore
        }
      });
      return;
    }
    const player = players[name];
    if (!player) return;
    await player.seekTo(0);
    player.play();
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
