import { InteractionManager, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import { lockLandscapeOrientation } from './orientation';
import { stopMusic } from './audio';
import { showConfirm } from './dialogs';

type QuitGameOptions = {
  /** Shown under the title */
  message?: string;
  /** e.g. leave Supabase room, clear local store — runs after navigation starts */
  beforeNavigate?: () => void | Promise<void>;
  /** Where to go after quit (default home) */
  href?: Href;
};

/**
 * Leave the table and land on a menu screen — never finish the Android activity.
 * Always `replace` (not dismissTo) so an empty nav stack cannot kill the app.
 */
export function navigateAfterQuit(href: Href = '/'): void {
  const target = href;

  const go = () => {
    try {
      router.replace(target);
    } catch {
      try {
        router.navigate(target);
      } catch {
        /* ignore */
      }
    }
    void lockLandscapeOrientation();
    // Second pass: if the first replace raced with Modal teardown, force home.
    setTimeout(() => {
      try {
        router.replace(target);
      } catch {
        /* ignore */
      }
      void lockLandscapeOrientation();
    }, Platform.OS === 'android' ? 160 : 40);
  };

  InteractionManager.runAfterInteractions(() => {
    // Wait for confirm Modal to unmount (Android Activity can die if we nav mid-Modal).
    setTimeout(go, Platform.OS === 'android' ? 120 : 0);
  });
}

/**
 * Standard in-game quit — confirm, stop music, return to menu, then cleanup.
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
          navigateAfterQuit(href);
          // Cleanup after nav is queued so screens don't redirect on null state.
          setTimeout(() => {
            void (async () => {
              try {
                await beforeNavigate?.();
              } catch {
                /* ignore */
              }
            })();
          }, Platform.OS === 'android' ? 280 : 80);
        })();
      },
    },
  ]);
}
