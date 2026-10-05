import { Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import { lockLandscapeOrientation } from './orientation';
import { stopMusic } from './audio';
import { showConfirm } from './dialogs';

type QuitGameOptions = {
  /** Shown under the title */
  message?: string;
  /** e.g. leave Supabase room */
  beforeNavigate?: () => void | Promise<void>;
  /** Where to go after quit (default home) */
  href?: Href;
};

type LeaveTableOptions = QuitGameOptions;

async function runBeforeNavigate(
  beforeNavigate?: () => void | Promise<void>
): Promise<void> {
  if (!beforeNavigate) return;
  await Promise.race([
    Promise.resolve().then(() => beforeNavigate()),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]).catch(() => {
    /* still leave */
  });
}

function safeReplace(href: Href): void {
  try {
    // Never use dismiss / dismissAll / back — emptying the stack finishes Android.
    router.replace(href);
  } catch {
    try {
      router.navigate(href);
    } catch {
      try {
        router.replace('/' as Href);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Leave the table and land on a menu screen — never finish the Android activity.
 */
export function navigateAfterQuit(href: Href = '/'): void {
  const target = href;

  const go = () => {
    safeReplace(target);
    void lockLandscapeOrientation();
    // Second pass in case the first replace raced with dialog unmount.
    setTimeout(() => {
      safeReplace(target);
      void lockLandscapeOrientation();
    }, Platform.OS === 'android' ? 120 : 40);
  };

  // Dialog is no longer a Modal — short delay is enough for Zustand close.
  setTimeout(go, Platform.OS === 'android' ? 40 : 0);
}

/**
 * Standard in-game quit — confirm, stop music, cleanup, return to menu.
 */
export function confirmQuitGame({
  message = 'You will leave the current game.',
  beforeNavigate,
  href = '/',
}: QuitGameOptions = {}): void {
  showConfirm('Quit game?', message, [
    { text: 'Keep playing', style: 'cancel' },
    {
      text: 'Quit',
      style: 'destructive',
      onPress: () => {
        void (async () => {
          void stopMusic();
          await runBeforeNavigate(beforeNavigate);
          navigateAfterQuit(href);
        })();
      },
    },
  ]);
}

/** Waiting-room / online table — leave seat then return to online menu. */
export function confirmLeaveTable({
  message = 'You will leave this table and return to the home screen.',
  beforeNavigate,
  href = '/',
}: LeaveTableOptions = {}): void {
  showConfirm('Leave table?', message, [
    { text: 'Stay', style: 'cancel' },
    {
      text: 'Leave',
      style: 'destructive',
      onPress: () => {
        void (async () => {
          void stopMusic();
          await runBeforeNavigate(beforeNavigate);
          navigateAfterQuit(href);
        })();
      },
    },
  ]);
}
