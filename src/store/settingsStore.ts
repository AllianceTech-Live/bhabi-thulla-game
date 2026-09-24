import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AiDifficulty } from '../game/types';

export type LanguageCode = 'en' | 'ur';

interface SettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  cardAnimations: boolean;
  darkMode: boolean;
  language: LanguageCode;
  displayName: string;
  /** True once the player has saved a name. Stops the setup screen asking again. */
  nameConfirmed: boolean;
  defaultAiDifficulty: AiDifficulty;
  setSoundEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setCardAnimations: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;
  setLanguage: (v: LanguageCode) => void;
  setDisplayName: (v: string) => void;
  setNameConfirmed: (v: boolean) => void;
  setDefaultAiDifficulty: (v: AiDifficulty) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      cardAnimations: true,
      darkMode: true,
      language: 'en',
      displayName: 'Player',
      nameConfirmed: false,
      defaultAiDifficulty: 'medium',
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setCardAnimations: (cardAnimations) => set({ cardAnimations }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setLanguage: (language) => set({ language }),
      setDisplayName: (displayName) => set({ displayName }),
      setNameConfirmed: (nameConfirmed) => set({ nameConfirmed }),
      setDefaultAiDifficulty: (defaultAiDifficulty) =>
        set({ defaultAiDifficulty }),
    }),
    {
      name: 'bhabi-thulla-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
